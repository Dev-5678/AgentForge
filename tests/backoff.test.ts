/**
 * AgentForge - Exponential Backoff & Jitter Unit Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BackoffPolicy } from '../src/runtime/backoff';

describe('Exponential Backoff with Full Jitter Resilience', () => {
  it('computes exact exponential progression when jitterStrategy is NONE', () => {
    const policy = new BackoffPolicy({
      baseDelayMs: 100,
      multiplier: 2,
      maxDelayMs: 2000,
      jitterStrategy: 'NONE',
    });

    assert.strictEqual(policy.computeDelay(1), 100);  // 100 * 2^0
    assert.strictEqual(policy.computeDelay(2), 200);  // 100 * 2^1
    assert.strictEqual(policy.computeDelay(3), 400);  // 100 * 2^2
    assert.strictEqual(policy.computeDelay(4), 800);  // 100 * 2^3
    assert.strictEqual(policy.computeDelay(5), 1600); // 100 * 2^4
    assert.strictEqual(policy.computeDelay(6), 2000); // capped at maxDelayMs
  });

  it('guarantees FULL jitter stays within [0, exponentialBound]', () => {
    const policy = new BackoffPolicy({
      baseDelayMs: 200,
      multiplier: 2,
      maxDelayMs: 1000,
      jitterStrategy: 'FULL',
    });

    for (let i = 0; i < 20; i++) {
      const delay = policy.computeDelay(3); // bound is 200 * 2^2 = 800
      assert.ok(delay >= 0, `delay ${delay} should be >= 0`);
      assert.ok(delay <= 800, `delay ${delay} should be <= 800`);
    }
  });

  it('retries failing operation until success', async () => {
    const policy = new BackoffPolicy({
      baseDelayMs: 1,
      maxDelayMs: 10,
      maxAttempts: 4,
      jitterStrategy: 'NONE',
    });

    let calls = 0;
    const result = await policy.executeWithRetry(async (attempt) => {
      calls++;
      if (attempt < 3) {
        throw new Error('Transient rate limit');
      }
      return 'workflow-success';
    });

    assert.strictEqual(result, 'workflow-success');
    assert.strictEqual(calls, 3);
  });

  it('throws error when maxAttempts is exceeded', async () => {
    const policy = new BackoffPolicy({
      baseDelayMs: 1,
      maxDelayMs: 5,
      maxAttempts: 3,
      jitterStrategy: 'NONE',
    });

    let calls = 0;
    await assert.rejects(async () => {
      await policy.executeWithRetry(async () => {
        calls++;
        throw new Error('Permanent failure');
      });
    }, /Permanent failure/);

    assert.strictEqual(calls, 3);
  });
});
