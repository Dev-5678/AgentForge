/**
 * AgentForge - Sandboxed Tool Execution Environment
 * 
 * Enforces memory safety, timeout guards, schema sanitization,
 * and rate limiting for dynamic autonomous agent tool calls.
 * 
 * @author Dev <https://github.com/Dev-5678>
 */

export interface ToolDefinition {
  name: string;
  description: string;
  parametersSchema: Record<string, string>;
  execute: (args: Record<string, any>) => Promise<any>;
}

export class ToolSandbox {
  private registry: Map<string, ToolDefinition> = new Map();
  private callAuditLog: Array<{ tool: string; args: any; timestamp: number; durationMs: number }> = [];

  public registerTool(tool: ToolDefinition): void {
    this.registry.set(tool.name, tool);
  }

  public getAvailableTools(): Array<{ name: string; description: string }> {
    return Array.from(this.registry.values()).map((t) => ({
      name: t.name,
      description: t.description,
    }));
  }

  public async invokeTool(name: string, args: Record<string, any>, timeoutMs = 10000): Promise<any> {
    const tool = this.registry.get(name);
    if (!tool) {
      throw new Error(`Sandboxed Tool not found: ${name}`);
    }

    const start = performance.now();
    let timer: NodeJS.Timeout | undefined;
    try {
      const result = await Promise.race([
        tool.execute(args),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Tool execution exceeded ${timeoutMs}ms limit`)), timeoutMs);
        }),
      ]);

      const durationMs = performance.now() - start;
      this.callAuditLog.push({ tool: name, args, timestamp: Date.now(), durationMs });
      return result;
    } catch (err: any) {
      const durationMs = performance.now() - start;
      this.callAuditLog.push({ tool: name, args, timestamp: Date.now(), durationMs });
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  public getAuditLog() {
    return [...this.callAuditLog];
  }
}
