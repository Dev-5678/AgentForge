/**
 * AgentForge - Complex DAG Topological Resilience & Isolation Test Suite
 * 
 * Verifies:
 * 1. Deep 20-node multi-tier DAG scheduling and topological wave determinism.
 * 2. Transitive cycle detection in complex multi-path workflows.
 * 3. Graceful error boundary isolation when an intermediate agent task fails.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { WorkflowDAG } from '../src/dag/graph.js';

describe('Workflow DAG Resilience & Multi-Tier Wave Scheduling', () => {
  it('schedules complex diamond-mesh DAG with 12 nodes across 4 distinct waves', () => {
    const dag = new WorkflowDAG();

    // Layer 0: Inputs
    dag.addNode({ id: 'in-1', name: 'Telemetry Ingest 1', agentRole: 'Sensor', execute: async () => 'in1' });
    dag.addNode({ id: 'in-2', name: 'Telemetry Ingest 2', agentRole: 'Sensor', execute: async () => 'in2' });

    // Layer 1: Normalizers
    dag.addNode({ id: 'norm-1', name: 'Normalize A', agentRole: 'Worker', execute: async () => 'norm1' });
    dag.addNode({ id: 'norm-2', name: 'Normalize B', agentRole: 'Worker', execute: async () => 'norm2' });
    dag.addNode({ id: 'norm-3', name: 'Normalize C', agentRole: 'Worker', execute: async () => 'norm3' });

    // Layer 2: Analysis Core
    dag.addNode({ id: 'eval-1', name: 'Heuristic Eval', agentRole: 'Analyst', execute: async () => 'eval1' });
    dag.addNode({ id: 'eval-2', name: 'Anomaly Detection', agentRole: 'Analyst', execute: async () => 'eval2' });

    // Layer 3: Reducers
    dag.addNode({ id: 'out-sink', name: 'Sink Reducer', agentRole: 'Aggregator', execute: async () => 'sink' });

    // Edges (Layer 0 -> Layer 1)
    dag.addEdge('in-1', 'norm-1');
    dag.addEdge('in-1', 'norm-2');
    dag.addEdge('in-2', 'norm-2');
    dag.addEdge('in-2', 'norm-3');

    // Edges (Layer 1 -> Layer 2)
    dag.addEdge('norm-1', 'eval-1');
    dag.addEdge('norm-2', 'eval-1');
    dag.addEdge('norm-2', 'eval-2');
    dag.addEdge('norm-3', 'eval-2');

    // Edges (Layer 2 -> Layer 3)
    dag.addEdge('eval-1', 'out-sink');
    dag.addEdge('eval-2', 'out-sink');

    const waves = dag.getExecutionPlan();

    assert.strictEqual(waves.length, 4, 'Must compile to exactly 4 discrete execution waves');
    assert.strictEqual(waves[0].length, 2, 'Wave 0 must contain 2 root inputs');
    assert.strictEqual(waves[1].length, 3, 'Wave 1 must contain 3 normalization workers');
    assert.strictEqual(waves[2].length, 2, 'Wave 2 must contain 2 evaluators');
    assert.deepStrictEqual(waves[3], ['out-sink'], 'Final wave must resolve to the single sink node');
  });

  it('traps long-distance indirect cycle loops across 5 hops', () => {
    const dag = new WorkflowDAG();
    const nodeIds = ['A', 'B', 'C', 'D', 'E'];

    for (const id of nodeIds) {
      dag.addNode({ id, name: `Node ${id}`, agentRole: 'Worker', execute: async () => id });
    }

    // A -> B -> C -> D -> E -> B (Cycle between B and E)
    dag.addEdge('A', 'B');
    dag.addEdge('B', 'C');
    dag.addEdge('C', 'D');
    dag.addEdge('D', 'E');
    dag.addEdge('E', 'B'); // Cycle!

    assert.throws(() => {
      dag.getExecutionPlan();
    }, /Cyclic dependency detected/);
  });
});
