/**
 * AgentForge - Distributed Step Runtime & Execution Scheduler
 * 
 * Executes DAG waves concurrently with timeout boundaries,
 * exponential backoff retry policies, and structured state passing.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { WorkflowDAG, WorkflowNodeContext, NodeStatus } from '../dag/graph.js';
import { DistributedTracer, TraceSpan } from '../telemetry/tracer.js';

export interface WorkflowRunResult {
  runId: string;
  status: 'SUCCESS' | 'FAILED';
  durationMs: number;
  outputs: Record<string, any>;
  nodeStatuses: Record<string, NodeStatus>;
  error?: string;
}

export class WorkflowExecutor {
  private tracer: DistributedTracer;

  constructor(tracer?: DistributedTracer) {
    this.tracer = tracer || new DistributedTracer();
  }

  public async executeWorkflow(
    dag: WorkflowDAG,
    initialInputs: Record<string, any> = {}
  ): Promise<WorkflowRunResult> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const startTime = performance.now();
    const rootSpan = this.tracer.startSpan('WorkflowRun', { runId });

    const context: WorkflowNodeContext = {
      inputs: { ...initialInputs },
      outputs: {},
      state: {},
    };

    const nodeStatuses: Record<string, NodeStatus> = {};
    for (const node of dag.getAllNodes()) {
      nodeStatuses[node.id] = 'PENDING';
    }

    try {
      const executionWaves = dag.getExecutionPlan();

      for (let waveIndex = 0; waveIndex < executionWaves.length; waveIndex++) {
        const wave = executionWaves[waveIndex];
        const waveSpan = this.tracer.startSpan(`Wave-${waveIndex}`, { waveSize: wave.length }, rootSpan.id);

        // Execute nodes in the current wave concurrently
        await Promise.all(
          wave.map(async (nodeId) => {
            const node = dag.getNode(nodeId)!;
            const nodeSpan = this.tracer.startSpan(`Node:${node.name}`, {
              nodeId,
              agentRole: node.agentRole,
            }, waveSpan.id);

            // Conditional execution check
            if (node.condition && !node.condition(context)) {
              nodeStatuses[nodeId] = 'SKIPPED';
              nodeSpan.end({ status: 'SKIPPED' });
              return;
            }

            nodeStatuses[nodeId] = 'RUNNING';
            let attempts = 0;
            const maxAttempts = node.maxRetries || 1;
            let success = false;
            let lastError: any = null;

            while (attempts < maxAttempts && !success) {
              attempts++;
              let timer: NodeJS.Timeout | undefined;
              try {
                // Execute with timeout race
                const output = await Promise.race([
                  node.execute(context),
                  new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error(`Timeout exceeded ${node.timeoutMs}ms`)), node.timeoutMs);
                  }),
                ]);

                context.outputs[nodeId] = output;
                nodeStatuses[nodeId] = 'COMPLETED';
                nodeSpan.end({ status: 'COMPLETED', attempts });
                success = true;
              } catch (err: any) {
                lastError = err;
                if (attempts < maxAttempts) {
                  // Exponential backoff
                  const backoffMs = Math.min(100 * Math.pow(2, attempts), 2000);
                  await new Promise((r) => setTimeout(r, backoffMs));
                }
              } finally {
                if (timer) clearTimeout(timer);
              }
            }

            if (!success) {
              nodeStatuses[nodeId] = 'FAILED';
              nodeSpan.end({ status: 'FAILED', error: lastError?.message });
              throw new Error(`Node [${node.name}] failed after ${attempts} attempts: ${lastError?.message}`);
            }
          })
        );

        waveSpan.end({ status: 'SUCCESS' });
      }

      rootSpan.end({ status: 'SUCCESS' });
      return {
        runId,
        status: 'SUCCESS',
        durationMs: performance.now() - startTime,
        outputs: context.outputs,
        nodeStatuses,
      };
    } catch (err: any) {
      rootSpan.end({ status: 'FAILED', error: err.message });
      return {
        runId,
        status: 'FAILED',
        durationMs: performance.now() - startTime,
        outputs: context.outputs,
        nodeStatuses,
        error: err.message,
      };
    }
  }
}
