import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DynamicBranchEvaluator, BranchCycleGuard } from '../src/dag/branching.js';

describe('DAG Dynamic Branching', () => {
  it('routes correctly based on context pattern match', () => {
    const branch = {
      id: 'branch-1',
      condition: (ctx: any) => ctx.sentiment === 'POSITIVE',
      trueBranchNodeId: 'node-celebrate',
      falseBranchNodeId: 'node-escalate',
    };

    const targetTrue = DynamicBranchEvaluator.evaluateBranch(branch, { sentiment: 'POSITIVE' });
    assert.strictEqual(targetTrue, 'node-celebrate');

    const targetFalse = DynamicBranchEvaluator.evaluateBranch(branch, { sentiment: 'NEGATIVE' });
    assert.strictEqual(targetFalse, 'node-escalate');
  });

  it('detects cyclic dynamic branch paths', () => {
    const visited = new Set<string>(['node-A', 'node-B']);
    assert.throws(() => {
      BranchCycleGuard.assertAcyclicBranch(visited, 'node-A');
    }, /Cycle detected/);
  });
});