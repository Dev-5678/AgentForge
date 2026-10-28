/**
 * AgentForge - Core Workflow Types
 * 
 * @author Dev <https://github.com/Dev-5678>
 */

export type NodeStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface WorkflowNodeContext {
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  state: Record<string, any>;
}

export interface WorkflowNode {
  id: string;
  name: string;
  agentRole: string;
  toolName?: string;
  maxRetries?: number;
  timeoutMs?: number;
  condition?: (ctx: WorkflowNodeContext) => boolean;
  execute: (ctx: WorkflowNodeContext) => Promise<any>;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: (result: any) => boolean;
}
