/**
 * AgentForge - Distributed Step Runtime & Execution Scheduler
 * 
 * Executes DAG waves concurrently with timeout boundaries,
 * exponential backoff retry policies, structured state passing,
 * real-time telemetry streaming, and cryptographic audit hashing.
 * 
 * @author Dev <https://github.com/Dev-5678>
 */

import { WorkflowDAG, WorkflowNodeContext, NodeStatus } from '../dag/graph.js';
import { DistributedTracer } from '../telemetry/tracer.js';
import { ExecutionAuditLedger } from './audit-ledger.js';

export type WorkflowEventType =
  | 'WORKFLOW_STARTED'
  | 'WAVE_STARTED'
  | 'NODE_STARTED'
  | 'NODE_LOG'
  | 'TOOL_CALL'
  | 'NODE_COMPLETED'
  | 'NODE_FAILED'
  | 'NODE_SKIPPED'
  | 'WAVE_COMPLETED'
  | 'AUDIT_RECORD'
  | 'WORKFLOW_COMPLETED';

export interface WorkflowEvent {
  type: WorkflowEventType;
  runId: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface WorkflowRunResult {
  runId: string;
  status: 'SUCCESS' | 'FAILED';
  durationMs: number;
  outputs: Record<string, any>;
  nodeStatuses: Record<string, NodeStatus>;
  auditLedger: ExecutionAuditLedger;
  error?: string;
}

export class WorkflowExecutor {
  private tracer: DistributedTracer;
  private auditLedger: ExecutionAuditLedger;

  constructor(tracer?: DistributedTracer, auditLedger?: ExecutionAuditLedger) {
    this.tracer = tracer || new DistributedTracer();
    this.auditLedger = auditLedger || new ExecutionAuditLedger();
  }

  public getAuditLedger(): ExecutionAuditLedger {
    return this.auditLedger;
  }

  public getTracer(): DistributedTracer {
    return this.tracer;
  }

  public async executeWorkflow(
    dag: WorkflowDAG,
    initialInputs: Record<string, any> = {},
    onEvent?: (event: WorkflowEvent) => void
  ): Promise<WorkflowRunResult> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const startTime = performance.now();
    const rootSpan = this.tracer.startSpan('WorkflowRun', { runId });

    const emit = (type: WorkflowEventType, data: Record<string, any>) => {
      if (onEvent) {
        onEvent({
          type,
          runId,
          timestamp: Date.now(),
          data,
        });
      }
    };

    emit('WORKFLOW_STARTED', {
      runId,
      totalNodes: dag.getAllNodes().length,
      initialInputs,
    });

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
        const waveStartTime = performance.now();
        const waveSpan = this.tracer.startSpan(`Wave-${waveIndex}`, { waveSize: wave.length }, rootSpan.id);

        emit('WAVE_STARTED', {
          waveIndex,
          totalWaves: executionWaves.length,
          nodeIds: wave,
        });

        // Execute all nodes in the current wave concurrently
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
              emit('NODE_SKIPPED', { nodeId, name: node.name });
              return;
            }

            nodeStatuses[nodeId] = 'RUNNING';
            emit('NODE_STARTED', {
              nodeId,
              name: node.name,
              agentRole: node.agentRole,
              toolName: node.toolName,
            });

            this.auditLedger.record(runId, nodeId, 'RUNNING', {
              name: node.name,
              agentRole: node.agentRole,
            });

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

                const auditRec = this.auditLedger.record(runId, nodeId, 'COMPLETED', {
                  output,
                  attempts,
                });

                emit('AUDIT_RECORD', {
                  blockIndex: auditRec.index,
                  hash: auditRec.hash,
                  previousHash: auditRec.previousHash,
                  stepId: nodeId,
                });

                emit('NODE_COMPLETED', {
                  nodeId,
                  name: node.name,
                  agentRole: node.agentRole,
                  output,
                  attempts,
                });

                success = true;
              } catch (err: any) {
                lastError = err;
                if (attempts < maxAttempts) {
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

              this.auditLedger.record(runId, nodeId, 'FAILED', {
                error: lastError?.message,
              });

              emit('NODE_FAILED', {
                nodeId,
                name: node.name,
                error: lastError?.message,
              });

              throw new Error(`Node [${node.name}] failed after ${attempts} attempts: ${lastError?.message}`);
            }
          })
        );

        const waveDurationMs = performance.now() - waveStartTime;
        waveSpan.end({ status: 'SUCCESS', durationMs: waveDurationMs });

        emit('WAVE_COMPLETED', {
          waveIndex,
          durationMs: waveDurationMs,
        });
      }

      rootSpan.end({ status: 'SUCCESS' });
      const totalDuration = performance.now() - startTime;

      emit('WORKFLOW_COMPLETED', {
        runId,
        status: 'SUCCESS',
        durationMs: totalDuration,
        outputs: context.outputs,
      });

      return {
        runId,
        status: 'SUCCESS',
        durationMs: totalDuration,
        outputs: context.outputs,
        nodeStatuses,
        auditLedger: this.auditLedger,
      };
    } catch (err: any) {
      rootSpan.end({ status: 'FAILED', error: err.message });
      const totalDuration = performance.now() - startTime;

      emit('WORKFLOW_COMPLETED', {
        runId,
        status: 'FAILED',
        durationMs: totalDuration,
        error: err.message,
      });

      return {
        runId,
        status: 'FAILED',
        durationMs: totalDuration,
        outputs: context.outputs,
        nodeStatuses,
        auditLedger: this.auditLedger,
        error: err.message,
      };
    }
  }
}
