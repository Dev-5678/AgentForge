import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TaskQueueManager } from '../src/runtime/queue.js';

describe('Distributed Task Queue', () => {
  it('dispatches tasks in priority order', () => {
    const queue = new TaskQueueManager<string>();
    queue.push('low-priority-job', 1);
    queue.push('urgent-security-audit', 10);
    queue.push('medium-ingestion-step', 5);

    const first = queue.pop();
    assert.strictEqual(first?.payload, 'urgent-security-audit');
    const second = queue.pop();
    assert.strictEqual(second?.payload, 'medium-ingestion-step');
    const third = queue.pop();
    assert.strictEqual(third?.payload, 'low-priority-job');
  });
});