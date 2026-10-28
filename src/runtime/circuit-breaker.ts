/**
 * AgentForge - Circuit Breaker Pattern Implementation
 * 
 * Protects downstream agent services from cascading failures by isolating
 * degraded dependencies with automatic cooldown decay and half-open probe testing.
 * 
 * @author Dev <https://github.com/Dev-5678>
 */

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  cooldownPeriodMs: number;
  halfOpenMaxProbes?: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private consecutiveFailures: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenProbesAttempted: number = 0;
  private readonly failureThreshold: number;
  private readonly cooldownPeriodMs: number;
  private readonly halfOpenMaxProbes: number;

  constructor(config: CircuitBreakerConfig) {
    this.failureThreshold = config.failureThreshold;
    this.cooldownPeriodMs = config.cooldownPeriodMs;
    this.halfOpenMaxProbes = config.halfOpenMaxProbes ?? 1;
  }

  public getState(now: number = Date.now()): CircuitBreakerState {
    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime >= this.cooldownPeriodMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenProbesAttempted = 0;
      }
    }
    return this.state;
  }

  public canExecute(now: number = Date.now()): boolean {
    const currentState = this.getState(now);
    if (currentState === 'CLOSED') return true;
    if (currentState === 'HALF_OPEN') {
      return this.halfOpenProbesAttempted < this.halfOpenMaxProbes;
    }
    return false; // OPEN
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN' || this.state === 'OPEN') {
      this.state = 'CLOSED';
      this.consecutiveFailures = 0;
      this.halfOpenProbesAttempted = 0;
    } else {
      this.consecutiveFailures = 0;
    }
  }

  public recordFailure(now: number = Date.now()): void {
    this.lastFailureTime = now;
    if (this.state === 'HALF_OPEN') {
      // Immediate trip back to OPEN
      this.state = 'OPEN';
      this.halfOpenProbesAttempted = 0;
    } else {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.state = 'OPEN';
      }
    }
  }

  public markProbeAttempt(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenProbesAttempted++;
    }
  }

  public getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
    this.halfOpenProbesAttempted = 0;
  }
}
