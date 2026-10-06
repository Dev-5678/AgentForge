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