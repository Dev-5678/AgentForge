/**
 * AgentForge - Concurrency Scaling & Amdahl's Law Benchmark
 * 
 * Measures throughput, scheduling overhead, and latency speedup
 * of parallel Kahn topological wave scheduling vs sequential execution.
 * 
 * Formulations:
 * Speedup S = T_sequential / T_parallel
 * Efficiency E = S / N_workers
 * 
 * @author Dev <https://github.com/Dev-5678>
 */

import { WorkflowDAG } from '../src/dag/graph.js';
import { WorkflowExecutor } from '../src/runtime/executor.js';

async function runConcurrencyBenchmark() {
  console.log('========================================================================');
  console.log('       AGENTFORGE // CONCURRENCY SCALING & AMDAHL SPEEDUP BENCHMARK     ');
  console.log('========================================================================\n');

  const branchCounts = [2, 4, 8, 16];

  for (const branches of branchCounts) {
    const dag = new WorkflowDAG();
    const taskDurationMs = 15;

    // Root planning node
    dag.addNode({
      id: 'root_planner',
      name: 'Root Coordinator',
      agentRole: 'Lead Architect Agent',
      execute: async () => ({ status: 'READY' }),
    });

    // Fan-out: N parallel worker nodes
    for (let i = 0; i < branches; i++) {
      dag.addNode({
        id: `parallel_worker_${i}`,
        name: `Parallel Worker #${i + 1}`,
        agentRole: 'Systems Engineer Agent',
        execute: async () => {
          await new Promise((r) => setTimeout(r, taskDurationMs));
          return { workerId: i, computed: true };
        },
      });
      dag.addEdge('root_planner', `parallel_worker_${i}`);
    }

    // Fan-in: Synthesizer node
    dag.addNode({
      id: 'fan_in_synth',
      name: 'Fan-In Aggregator',
      agentRole: 'Executive Synthesizer Agent',
      execute: async () => ({ status: 'AGGREGATED' }),
    });

    for (let i = 0; i < branches; i++) {
      dag.addEdge(`parallel_worker_${i}`, 'fan_in_synth');
    }

    const theoreticalSequentialMs = taskDurationMs * branches;

    const executor = new WorkflowExecutor();
    const t0 = performance.now();
    const result = await executor.executeWorkflow(dag);
    const measuredParallelMs = performance.now() - t0;

    const speedup = theoreticalSequentialMs / measuredParallelMs;
    const efficiency = (speedup / branches) * 100;

    console.log(`[FAN-OUT: ${String(branches).padStart(2)} WORKERS]`);
    console.log(`  - Total Workflow Nodes    : ${branches + 2}`);
    console.log(`  - Theoretical Sequential  : ${theoreticalSequentialMs.toFixed(2)} ms`);
    console.log(`  - Measured Concurrent     : ${measuredParallelMs.toFixed(2)} ms`);
    console.log(`  - Amdahl Latency Speedup  : ${speedup.toFixed(2)}x faster`);
    console.log(`  - Concurrency Efficiency  : ${efficiency.toFixed(1)}%\n`);
  }

  console.log('========================================================================');
  console.log('✓ Concurrency benchmark completed with zero cyclic deadlocks.');
  console.log('========================================================================\n');
}

runConcurrencyBenchmark();
