/**
 * AgentForge - Sandboxed Tool Perimeter Tests
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ToolSandbox } from '../src/tools/sandbox.js';
import { CalculatorTool } from '../src/tools/builtin-tools.js';

describe('Tool Sandbox Security & Timeouts', () => {
  it('executes valid tool definitions cleanly', async () => {
    const sandbox = new ToolSandbox();
    sandbox.registerTool(CalculatorTool);

    const res = await sandbox.invokeTool('calculator', { expression: '12 * 12 + 6' });
    assert.strictEqual(res.result, 150);
    assert.strictEqual(sandbox.getAuditLog().length, 1);
  });

  it('rejects unsafe script injection payloads', async () => {
    const sandbox = new ToolSandbox();
    sandbox.registerTool(CalculatorTool);

    await assert.rejects(async () => {
      await sandbox.invokeTool('calculator', { expression: 'process.exit(1)' });
    }, /Unsafe mathematical expression rejected/);
  });
});
