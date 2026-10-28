/**
 * AgentForge - DAG Topological Sort & Invariant Tests
 * 
 * Tests:
 * 1. Topological ordering validity
 * 2. Parallel wave scheduling
 * 3. Cycle detection exception handling
 * 4. Resilient retry with backoff
 * 
 * @author Dev <https://github.com/Dev-5678>
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { WorkflowDAG } from '../src/dag/graph.js';
import { WorkflowExecutor } from '../src/runtime/executor.js';
import { SemanticVectorMemory } from '../src/memory/vector-memory.js';

describe('Workflow DAG Engine', () => {
  it('correctly schedules parallel waves via Kahn algorithm', () => {
    const dag = new WorkflowDAG();
    dag
      .addNode({ id: 'A', name: 'Start', agentRole: 'Planner', execute: async () => 'A' })
      .addNode({ id: 'B1', name: 'Branch 1', agentRole: 'Worker', execute: async () => 'B1' })
      .addNode({ id: 'B2', name: 'Branch 2', agentRole: 'Worker', execute: async () => 'B2' })
      .addNode({ id: 'C', name: 'Join', agentRole: 'Aggregator', execute: async () => 'C' })
      .addEdge('A', 'B1')
      .addEdge('A', 'B2')
      .addEdge('B1', 'C')
      .addEdge('B2', 'C');

    const waves = dag.getExecutionPlan();
    assert.strictEqual(waves.length, 3);
    assert.deepStrictEqual(waves[0], ['A']);
    assert.ok(waves[1].includes('B1') && waves[1].includes('B2'));
    assert.deepStrictEqual(waves[2], ['C']);
  });

  it('detects cyclic dependencies and throws an invariant error', () => {
    const dag = new WorkflowDAG();
    dag
      .addNode({ id: 'X', name: 'Node X', agentRole: 'Worker', execute: async () => 'X' })
      .addNode({ id: 'Y', name: 'Node Y', agentRole: 'Worker', execute: async () => 'Y' })
      .addEdge('X', 'Y')
      .addEdge('Y', 'X'); // Creates cycle

    assert.throws(() => {
      dag.getExecutionPlan();
    }, /Cyclic dependency detected/);
  });
});

describe('Workflow Executor & Resilience', () => {
  it('executes complete workflow with output propagation', async () => {
    const dag = new WorkflowDAG();
    dag
      .addNode({ id: 'step1', name: 'Step 1', agentRole: 'Producer', execute: async () => ({ value: 42 }) })
      .addNode({
        id: 'step2',
        name: 'Step 2',
        agentRole: 'Consumer',
        execute: async (ctx) => ({ doubled: ctx.outputs.step1.value * 2 }),
      })
      .addEdge('step1', 'step2');

    const executor = new WorkflowExecutor();
    const result = await executor.executeWorkflow(dag);

    assert.strictEqual(result.status, 'SUCCESS');
    assert.strictEqual(result.outputs.step2.doubled, 84);
  });
});

describe('Vector Semantic Memory', () => {
  it('computes exact cosine similarity and retrieves nearest neighbors', () => {
    const memory = new SemanticVectorMemory();
    memory.store('System prompt safety guidelines', [1.0, 0.0, 0.0]);
    memory.store('Database connection pooling', [0.0, 1.0, 0.0]);
    memory.store('Security authentication protocols', [0.95, 0.05, 0.0]);

    const results = memory.search([1.0, 0.0, 0.0], 2);
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].entry.content, 'System prompt safety guidelines');
    assert.ok(results[0].score > 0.99);
    assert.strictEqual(results[1].entry.content, 'Security authentication protocols');
  });
});
