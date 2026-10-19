import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CircuitBreaker } from '../src/runtime/circuit-breaker.js';

describe('Circuit Breaker Resilience Engine', () => {
  it('starts in CLOSED state and allows execution', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, cooldownPeriodMs: 5000 });
    assert.strictEqual(cb.getState(), 'CLOSED');
    assert.strictEqual(cb.canExecute(), true);
  });

  it('trips to OPEN state when consecutive failures exceed threshold', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownPeriodMs: 5000 });
    const now = 10000;

    cb.recordFailure(now);
    assert.strictEqual(cb.getState(now), 'CLOSED');
    assert.strictEqual(cb.canExecute(now), true);

    cb.recordFailure(now);
    assert.strictEqual(cb.getState(now), 'OPEN');
    assert.strictEqual(cb.canExecute(now), false);
  });

  it('transitions from OPEN to HALF_OPEN after cooldown period elapses', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownPeriodMs: 4000 });
    const now = 10000;

    cb.recordFailure(now);
    cb.recordFailure(now);
    assert.strictEqual(cb.getState(now), 'OPEN');

    // 2000ms later -> still OPEN
    assert.strictEqual(cb.getState(now + 2000), 'OPEN');
    assert.strictEqual(cb.canExecute(now + 2000), false);

    // 4001ms later -> transitions to HALF_OPEN
    assert.strictEqual(cb.getState(now + 4001), 'HALF_OPEN');
    assert.strictEqual(cb.canExecute(now + 4001), true);
  });

  it('resets to CLOSED when probe execution succeeds in HALF_OPEN state', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownPeriodMs: 3000 });
    const now = 10000;

    cb.recordFailure(now);
    cb.recordFailure(now);
    assert.strictEqual(cb.getState(now + 3500), 'HALF_OPEN');

    cb.markProbeAttempt();
    cb.recordSuccess();

    assert.strictEqual(cb.getState(now + 3500), 'CLOSED');
    assert.strictEqual(cb.canExecute(now + 3500), true);
    assert.strictEqual(cb.getConsecutiveFailures(), 0);
  });

  it('immediately returns to OPEN if probe execution fails in HALF_OPEN state', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownPeriodMs: 3000 });
    const now = 10000;

    cb.recordFailure(now);
    cb.recordFailure(now);
    assert.strictEqual(cb.getState(now + 3500), 'HALF_OPEN');

    cb.markProbeAttempt();
    cb.recordFailure(now + 3500);

    assert.strictEqual(cb.getState(now + 3500), 'OPEN');
    assert.strictEqual(cb.canExecute(now + 3500), false);
  });
});
