import { TaskQueueManager } from '../src/runtime/queue.js';

function runQueueBenchmark() {
  console.log('=== AgentForge // 10,000 Task Queue Benchmark ===');
  const queue = new TaskQueueManager<number>();
  const TASKS = 10000;

  const t0 = performance.now();
  for (let i = 0; i < TASKS; i++) {
    queue.push(i, Math.floor(Math.random() * 100));
  }
  const t1 = performance.now();

  let popped = 0;
  while (queue.getQueueDepth() > 0) {
    queue.pop();
    popped++;
  }
  const t2 = performance.now();

  console.log(Pushed  priority tasks in  ms);
  console.log(Dispatched  tasks in  ms);
  console.log(Queue Throughput:  ops/sec\n);
}

runQueueBenchmark();