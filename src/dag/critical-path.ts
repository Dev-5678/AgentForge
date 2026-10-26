/**
 * AgentForge - DAG Topological Critical Path Calculator
 * 
 * Computes the longest dependency critical path, step slack bounds,
 * and minimum theoretical makespan across autonomous multi-agent DAGs.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export interface DAGTaskNode {
  id: string;
  durationMs: number;
  dependencies: string[];
}

export interface CriticalPathResult {
  criticalPath: string[];
  totalCriticalDurationMs: number;
  stepEarliestFinish: Record<string, number>;
  slackMs: Record<string, number>;
  bottleneckSteps: string[];
}

export class CriticalPathAnalyzer {
  /**
   * Computes the critical path and makespan of a DAG
   */
  public static analyze(tasks: DAGTaskNode[]): CriticalPathResult {
    const taskMap = new Map<string, DAGTaskNode>();
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();

    for (const t of tasks) {
      taskMap.set(t.id, t);
      inDegree.set(t.id, t.dependencies.length);
      dependents.set(t.id, []);
    }

    // Build adjacency
    for (const t of tasks) {
      for (const depId of t.dependencies) {
        if (!dependents.has(depId)) {
          dependents.set(depId, []);
        }
        dependents.get(depId)!.push(t.id);
      }
    }

    // Forward Pass: Earliest Start Time (EST) & Earliest Finish Time (EFT)
    const est = new Map<string, number>();
    const eft = new Map<string, number>();
    const predecessorMap = new Map<string, string | null>();

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(id);
        est.set(id, 0);
        const dur = taskMap.get(id)?.durationMs ?? 0;
        eft.set(id, dur);
        predecessorMap.set(id, null);
      }
    }

    let processedCount = 0;

    while (queue.length > 0) {
      const u = queue.shift()!;
      processedCount++;
      const uEft = eft.get(u) ?? 0;

      for (const v of dependents.get(u) ?? []) {
        const vEst = Math.max(est.get(v) ?? 0, uEft);
        est.set(v, vEst);

        const vDur = taskMap.get(v)?.durationMs ?? 0;
        eft.set(v, vEst + vDur);

        const currentDeg = inDegree.get(v)! - 1;
        inDegree.set(v, currentDeg);

        if (currentDeg === 0) {
          queue.push(v);
        }
      }
    }

    if (processedCount < tasks.length) {
      throw new Error('Cyclic dependency detected in task graph; cannot compute critical path');
    }

    // Determine max makespan
    let maxEft = 0;
    let endNodeId: string | null = null;
    for (const [id, finish] of eft.entries()) {
      if (finish > maxEft) {
        maxEft = finish;
        endNodeId = id;
      }
    }

    // Backward Pass: Latest Start Time (LST) & Latest Finish Time (LFT)
    const lft = new Map<string, number>();
    const lst = new Map<string, number>();

    for (const id of taskMap.keys()) {
      lft.set(id, maxEft);
    }

    // Traverse in reverse topological order
    const reverseTasks = [...tasks].reverse();
    for (const t of reverseTasks) {
      const children = dependents.get(t.id) ?? [];
      if (children.length > 0) {
        let minChildLst = Number.POSITIVE_INFINITY;
        for (const childId of children) {
          minChildLst = Math.min(minChildLst, lst.get(childId) ?? maxEft);
        }
        lft.set(t.id, minChildLst);
      }
      lst.set(t.id, (lft.get(t.id) ?? maxEft) - t.durationMs);
    }

    // Calculate slack and identify critical path steps (slack == 0)
    const slackMs: Record<string, number> = {};
    const criticalSteps: string[] = [];

    for (const t of tasks) {
      const s = Math.max(0, (lst.get(t.id) ?? 0) - (est.get(t.id) ?? 0));
      slackMs[t.id] = s;
      if (s === 0) {
        criticalSteps.push(t.id);
      }
    }

    const stepEarliestFinish: Record<string, number> = {};
    eft.forEach((v, k) => {
      stepEarliestFinish[k] = v;
    });

    return {
      criticalPath: criticalSteps,
      totalCriticalDurationMs: maxEft,
      stepEarliestFinish,
      slackMs,
      bottleneckSteps: criticalSteps,
    };
  }
}
