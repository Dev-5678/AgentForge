/**
 * AgentForge - LLM Token Rate Budget & Sliding-Window Quota Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

interface TokenUsageRecord {
  timestamp: number;
  tokens: number;
}

class AgentTokenLimiter {
  private history: Map<string, TokenUsageRecord[]> = new Map();
  private maxTokensPerWindow: number;
  private windowDurationMs: number;

  constructor(maxTokensPerWindow = 10000, windowDurationMs = 60000) {
    this.maxTokensPerWindow = maxTokensPerWindow;
    this.windowDurationMs = windowDurationMs;
  }

  public recordUsage(agentId: string, tokens: number, now = Date.now()): void {
    const list = this.history.get(agentId) || [];
    list.push({ timestamp: now, tokens });
    this.history.set(agentId, list);
  }

  public getAvailableBudget(agentId: string, now = Date.now()): number {
    const cutoff = now - this.windowDurationMs;
    const list = this.history.get(agentId) || [];
    const valid = list.filter((r) => r.timestamp > cutoff);
    this.history.set(agentId, valid);

    const used = valid.reduce((sum, r) => sum + r.tokens, 0);
    return Math.max(0, this.maxTokensPerWindow - used);
  }

  public canExecuteTask(agentId: string, estimatedTokens: number, now = Date.now()): boolean {
    return this.getAvailableBudget(agentId, now) >= estimatedTokens;
  }
}

describe('Agent Token Rate Budget & Sliding-Window Quota', () => {
  it('enforces maximum token throughput and tracks sliding window decay', () => {
    const limiter = new AgentTokenLimiter(5000, 10000);
    const agent = 'researcher-agent-1';

    limiter.recordUsage(agent, 3000, 1000);
    limiter.recordUsage(agent, 1500, 2000);

    assert.strictEqual(limiter.getAvailableBudget(agent, 3000), 500);
    assert.strictEqual(limiter.canExecuteTask(agent, 600, 3000), false);
    assert.strictEqual(limiter.canExecuteTask(agent, 400, 3000), true);

    // After window expires for first record
    assert.strictEqual(limiter.getAvailableBudget(agent, 11500), 3500);
  });
});
