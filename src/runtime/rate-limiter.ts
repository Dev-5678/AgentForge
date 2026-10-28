/**
 * AgentForge - Multi-Provider LLM Token & Request Quota Limiter
 * 
 * @author Dev <https://github.com/Dev-5678>
 */

export interface ProviderQuota {
  provider: 'OPENAI' | 'ANTHROPIC' | 'GEMINI';
  requestsPerMinute: number;
  tokensPerMinute: number;
}
export class ProviderRateLimiter {
  private quotas: Map<string, ProviderQuota> = new Map();
  private requestTimestamps: Map<string, number[]> = new Map();

  public registerQuota(quota: ProviderQuota): void {
    this.quotas.set(quota.provider, quota);
    this.requestTimestamps.set(quota.provider, []);
  }

  public async acquire(provider: string, now = Date.now()): Promise<boolean> {
    const quota = this.quotas.get(provider);
    if (!quota) return true;

    const timestamps = this.requestTimestamps.get(provider) || [];
    const oneMinAgo = now - 60000;
    const recent = timestamps.filter(t => t > oneMinAgo);
    this.requestTimestamps.set(provider, recent);

    if (recent.length >= quota.requestsPerMinute) {
      return false;
    }

    recent.push(now);
    return true;
  }
}
export class TokenReservationPool {
  private reservedTokens = 0;
  private maxTokens: number;

  constructor(maxTokens = 100000) {
    this.maxTokens = maxTokens;
  }

  public reserve(amount: number): boolean {
    if (this.reservedTokens + amount > this.maxTokens) return false;
    this.reservedTokens += amount;
    return true;
  }

  public release(amount: number): void {
    this.reservedTokens = Math.max(0, this.reservedTokens - amount);
  }
}