/**
 * AgentForge - Worker Heartbeat Timeout & Task Preemption Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

interface WorkerStatus {
  id: string;
  lastHeartbeat: number;
  currentTaskId: string | null;
  state: 'IDLE' | 'BUSY' | 'DEAD';
}

class ResilientWorkerPool {
  private workers: Map<string, WorkerStatus> = new Map();
  private heartbeatTimeoutMs: number;
  private pendingTasks: string[] = [];

  constructor(options: { heartbeatTimeoutMs?: number } = {}) {
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 3000;
  }

  public registerWorker(workerId: string): void {
    this.workers.set(workerId, {
      id: workerId,
      lastHeartbeat: Date.now(),
      currentTaskId: null,
      state: 'IDLE',
    });
  }

  public recordHeartbeat(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.lastHeartbeat = Date.now();
      if (worker.state === 'DEAD') {
        worker.state = 'IDLE';
      }
    }
  }

  public assignTask(workerId: string, taskId: string): boolean {
    const worker = this.workers.get(workerId);
    if (!worker || worker.state !== 'IDLE') return false;
    worker.currentTaskId = taskId;
    worker.state = 'BUSY';
    return true;
  }

  public checkHealth(now: number = Date.now()): { deadWorkers: string[]; preemptedTasks: string[] } {
    const deadWorkers: string[] = [];
    const preemptedTasks: string[] = [];

    for (const [id, worker] of this.workers.entries()) {
      if (now - worker.lastHeartbeat > this.heartbeatTimeoutMs && worker.state !== 'DEAD') {
        worker.state = 'DEAD';
        deadWorkers.push(id);
        if (worker.currentTaskId) {
          preemptedTasks.push(worker.currentTaskId);
          this.pendingTasks.push(worker.currentTaskId);
          worker.currentTaskId = null;
        }
      }
    }

    return { deadWorkers, preemptedTasks };
  }

  public getPendingTasks(): string[] {
    return [...this.pendingTasks];
  }
}

describe('Worker Heartbeat Timeout & Task Preemption', () => {
  it('detects dead worker and re-queues orphaned task', () => {
    const pool = new ResilientWorkerPool({ heartbeatTimeoutMs: 2000 });
    pool.registerWorker('worker-alpha');
    pool.assignTask('worker-alpha', 'task-compile-dag');

    const simulatedNow = Date.now() + 3500;
    const { deadWorkers, preemptedTasks } = pool.checkHealth(simulatedNow);

    assert.deepStrictEqual(deadWorkers, ['worker-alpha']);
    assert.deepStrictEqual(preemptedTasks, ['task-compile-dag']);
    assert.deepStrictEqual(pool.getPendingTasks(), ['task-compile-dag']);
  });

  it('maintains active state if heartbeat updates regularly', () => {
    const pool = new ResilientWorkerPool({ heartbeatTimeoutMs: 2000 });
    pool.registerWorker('worker-beta');
    pool.assignTask('worker-beta', 'task-eval');

    pool.recordHeartbeat('worker-beta');
    const { deadWorkers } = pool.checkHealth(Date.now() + 1000);
    assert.strictEqual(deadWorkers.length, 0);
  });
});
