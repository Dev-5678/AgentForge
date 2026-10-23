/**
 * AgentForge - Critical Path Analyzer Unit Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CriticalPathAnalyzer, DAGTaskNode } from '../src/dag/critical-path';

describe('DAG Topological Critical Path Calculator', () => {
  it('identifies exact critical path in sequential pipeline', () => {
    const tasks: DAGTaskNode[] = [
      { id: 'fetch', durationMs: 100, dependencies: [] },
      { id: 'parse', durationMs: 200, dependencies: ['fetch'] },
      { id: 'save', durationMs: 50, dependencies: ['parse'] },
    ];

    const result = CriticalPathAnalyzer.analyze(tasks);
    assert.strictEqual(result.totalCriticalDurationMs, 350);
    assert.deepStrictEqual(result.criticalPath, ['fetch', 'parse', 'save']);
    assert.strictEqual(result.slackMs['fetch'], 0);
    assert.strictEqual(result.slackMs['parse'], 0);
    assert.strictEqual(result.slackMs['save'], 0);
  });

  it('selects the longest bottleneck branch in parallel fan-out fan-in DAG', () => {
    // Pipeline:
    // start (10ms) -> branchA (100ms) -> join (20ms)
    //              -> branchB (300ms) -> join
    const tasks: DAGTaskNode[] = [
      { id: 'start', durationMs: 10, dependencies: [] },
      { id: 'branchA', durationMs: 100, dependencies: ['start'] },
      { id: 'branchB', durationMs: 300, dependencies: ['start'] },
      { id: 'join', durationMs: 20, dependencies: ['branchA', 'branchB'] },
    ];

    const result = CriticalPathAnalyzer.analyze(tasks);
    // 10 + 300 + 20 = 330ms
    assert.strictEqual(result.totalCriticalDurationMs, 330);
    assert.ok(result.criticalPath.includes('branchB'));
    assert.ok(!result.criticalPath.includes('branchA'));
    // branchA slack should be 200ms
    assert.strictEqual(result.slackMs['branchA'], 200);
  });

  it('rejects cyclic graphs with an invariant error', () => {
    const cyclicTasks: DAGTaskNode[] = [
      { id: 'step1', durationMs: 50, dependencies: ['step2'] },
      { id: 'step2', durationMs: 50, dependencies: ['step1'] },
    ];

    assert.throws(() => {
      CriticalPathAnalyzer.analyze(cyclicTasks);
    }, /Cyclic dependency detected/);
  });
});
