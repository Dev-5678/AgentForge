/**
 * AgentForge - Distributed Task Queue & Worker Pool
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export interface QueuedTask<T = any> {
  id: string;
  priority: number; // Higher number = higher priority
  payload: T;
  enqueuedAt: number;
  attempts: number;
}