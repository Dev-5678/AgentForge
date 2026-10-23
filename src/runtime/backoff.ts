/**
 * AgentForge - Exponential Backoff with Full Jitter Resilience Policy
 * 
 * Provides decorrelated and full-jitter exponential backoff retry algorithms
 * to prevent thundering-herd synchronization when upstream LLM APIs or tool
 * runtimes encounter rate limits or transient failures.
 * 
 * Based on AWS Architecture & Google SRE Retry Formulations:
 * sleep = uniform_random(0, min(max_delay, base_delay * (multiplier ^ attempt)))
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export interface BackoffConfig {
  baseDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
  maxAttempts: number;
  jitterStrategy: 'FULL' | 'DECORRELATED' | 'NONE';
}

export interface RetryContext {
  attempt: number;
  lastDelayMs: number;
  totalDelayMs: number;
  error?: Error;
}

export class BackoffPolicy {
  private config: BackoffConfig;

  constructor(config: Partial<BackoffConfig> = {}) {
    this.config = {
      baseDelayMs: config.baseDelayMs ?? 100,
      maxDelayMs: config.maxDelayMs ?? 10000,
      multiplier: config.multiplier ?? 2,
      maxAttempts: config.maxAttempts ?? 5,
      jitterStrategy: config.jitterStrategy ?? 'FULL',
    };
  }

  /**
   * Calculates backoff duration for a given attempt index (1-based)
   */
  public computeDelay(attempt: number, prevDelay: number = 0): number {
    const { baseDelayMs, maxDelayMs, multiplier, jitterStrategy } = this.config;
    const cappedAttempt = Math.max(0, attempt - 1);
    const exponentialBound = Math.min(maxDelayMs, baseDelayMs * Math.pow(multiplier, cappedAttempt));

    switch (jitterStrategy) {
      case 'FULL':
        // Full jitter: random between 0 and exponential bound
        return Math.floor(Math.random() * (exponentialBound + 1));

      case 'DECORRELATED':
        // Decorrelated jitter: sleep = min(maxDelay, rand(baseDelay, sleep_prev * 3))
        const lowerBound = baseDelayMs;
        const upperBound = Math.min(maxDelayMs, Math.max(lowerBound, prevDelay * 3));
        return Math.floor(lowerBound + Math.random() * (upperBound - lowerBound + 1));

      case 'NONE':
      default:
        return exponentialBound;
    }
  }

  /**
   * Executes an async operation with automatic retry according to the policy
   */
  public async executeWithRetry<T>(
    operation: (attempt: number) => Promise<T>,
    shouldRetry?: (error: unknown, attempt: number) => boolean
  ): Promise<T> {
    let attempt = 1;
    let prevDelay = this.config.baseDelayMs;

    while (true) {
      try {
        return await operation(attempt);
      } catch (err) {
        if (attempt >= this.config.maxAttempts) {
          throw err;
        }

        if (shouldRetry && !shouldRetry(err, attempt)) {
          throw err;
        }

        const delayMs = this.computeDelay(attempt, prevDelay);
        prevDelay = delayMs;

        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        attempt++;
      }
    }
  }

  public getConfig(): Readonly<BackoffConfig> {
    return { ...this.config };
  }
}
