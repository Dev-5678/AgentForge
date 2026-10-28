/**
 * AgentForge - Directed Acyclic Graph (DAG) Workflow Engine
 * 
 * Implements topological sorting via Kahn's algorithm, cycle detection,
 * concurrency wave scheduling, and dynamic edge conditions.
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

export class WorkflowDAG {
  private nodes: Map<string, WorkflowNode> = new Map();
  private edges: WorkflowEdge[] = [];

  public addNode(node: WorkflowNode): this {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node duplicate ID detected: ${node.id}`);
    }
    this.nodes.set(node.id, {
      maxRetries: 3,
      timeoutMs: 30000,
      ...node,
    });
    return this;
  }

  public addEdge(from: string, to: string, condition?: (result: any) => boolean): this {
    if (!this.nodes.has(from)) throw new Error(`Source node not found: ${from}`);
    if (!this.nodes.has(to)) throw new Error(`Target node not found: ${to}`);
    this.edges.push({ from, to, condition });
    return this;
  }

  public getNode(id: string): WorkflowNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): WorkflowNode[] {
    return Array.from(this.nodes.values());
  }

  public getEdges(): WorkflowEdge[] {
    return [...this.edges];
  }

  /**
   * Topological sort via Kahn's algorithm with cycle detection
   */
  public getExecutionPlan(): string[][] {
    const inDegree: Map<string, number> = new Map();
    const adjList: Map<string, string[]> = new Map();

    for (const id of this.nodes.keys()) {
      inDegree.set(id, 0);
      adjList.set(id, []);
    }

    for (const edge of this.edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
      adjList.get(edge.from)!.push(edge.to);
    }

    // Parallel waves of executable nodes
    const waves: string[][] = [];
    let currentWave: string[] = [];

    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) currentWave.push(id);
    }

    let processedCount = 0;

    while (currentWave.length > 0) {
      waves.push(currentWave);
      processedCount += currentWave.length;
      const nextWave: string[] = [];

      for (const nodeId of currentWave) {
        for (const neighbor of adjList.get(nodeId) || []) {
          const currentDeg = inDegree.get(neighbor)! - 1;
          inDegree.set(neighbor, currentDeg);
          if (currentDeg === 0) {
            nextWave.push(neighbor);
          }
        }
      }

      currentWave = nextWave;
    }

    if (processedCount !== this.nodes.size) {
      throw new Error('Cyclic dependency detected in Workflow DAG. Invariant violated.');
    }

    return waves;
  }

  /**
   * Filter outgoing edges whose conditions evaluate to true for a node's output
   */
  public getActiveOutgoingEdges(fromNodeId: string, outputResult: any): WorkflowEdge[] {
    return this.edges.filter((edge) => {
      if (edge.from !== fromNodeId) return false;
      if (!edge.condition) return true; // Unconditional edge
      try {
        return edge.condition(outputResult);
      } catch {
        return false;
      }
    });
  }

  /**
   * Return total registered node count
   */
  public getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Return total registered edge count
   */
  public getEdgeCount(): number {
    return this.edges.length;
  }
}

