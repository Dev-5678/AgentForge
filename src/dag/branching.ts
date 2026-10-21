/**
 * AgentForge - Dynamic Branching & Conditional Edges
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export type BranchPredicate = (context: Record<string, any>) => boolean;

export interface DynamicBranchNode {
  id: string;
  condition: BranchPredicate;
  trueBranchNodeId: string;
  falseBranchNodeId: string;
}
export class DynamicBranchEvaluator {
  public static evaluateBranch(node: DynamicBranchNode, context: Record<string, any>): string {
    const outcome = node.condition(context);
    return outcome ? node.trueBranchNodeId : node.falseBranchNodeId;
  }
}
export class BranchCycleGuard {
  public static assertAcyclicBranch(visited: Set<string>, nextNodeId: string): void {
    if (visited.has(nextNodeId)) {
      throw new Error(Cycle detected during dynamic branching to []);
    }
    visited.add(nextNodeId);
  }
}