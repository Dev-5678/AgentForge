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
export class TaskQueueManager<T = any> {
  private queue: QueuedTask<T>[] = [];
  private deadLetterQueue: QueuedTask<T>[] = [];

  public push(payload: T, priority = 0): string {
    const id = 	ask--;
    this.queue.push({ id, priority, payload, enqueuedAt: Date.now(), attempts: 0 });
    this.queue.sort((a, b) => b.priority - a.priority);
    return id;
  }

  public pop(): QueuedTask<T> | undefined {
    return this.queue.shift();
  }

  public markFailed(task: QueuedTask<T>, maxRetries = 3): void {
    task.attempts++;
    if (task.attempts >= maxRetries) {
      this.deadLetterQueue.push(task);
    } else {
      this.queue.push(task);
      this.queue.sort((a, b) => b.priority - a.priority);
    }
  }

  public getQueueDepth(): number { return this.queue.length; }
  public getDeadLetterCount(): number { return this.deadLetterQueue.length; }
}