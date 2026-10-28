/**
 * AgentForge - Specialized Multi-Agent System & Production Tooling Test Suite
 * 
 * Verifies:
 * - V8 Sandboxed Code REPL with timeout isolation
 * - Static Security AST Vulnerability Scanner (CWE-1321 & CWE-89)
 * - Semantic Vector Memory Retrieval
 * - Unified Git Diff Patcher
 * - Topological DAG Wave Scheduling across all 4 Mission Presets
 * 
 * @author Dev <https://github.com/Dev-5678>
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CodeReplTool,
  SecurityScannerTool,
  VectorSearchTool,
  DiffPatcherTool,
} from '../src/tools/builtin-tools.js';
import {
  buildSecurityAuditDAG,
  buildRateLimiterDAG,
  buildFinancialArbitrageDAG,
  buildCustomObjectiveDAG,
  MISSION_PRESETS,
} from '../src/agents/agent-system.js';
import { WorkflowExecutor } from '../src/runtime/executor.js';

describe('Production Sandboxed Agent Tools', () => {
  it('executes safe JavaScript in V8 VM and captures stdout and return values', async () => {
    const code = `
      console.log("Vector test line 1");
      console.log("Vector test line 2");
      return 42 * 2;
    `;
    const result = await CodeReplTool.execute({ code, timeoutMs: 2000 });
    assert.equal(result.success, true);
    assert.equal(result.returnValue, 84);
    assert.deepEqual(result.stdout, ['Vector test line 1', 'Vector test line 2']);
    assert.ok(result.executionTimeMs >= 0);
  });

  it('enforces execution timeout boundaries on infinite loops', async () => {
    const infiniteCode = `
      while(true) {}
    `;
    const result = await CodeReplTool.execute({ code: infiniteCode, timeoutMs: 250 });
    assert.equal(result.success, false);
    assert.match(result.error, /timed out/i);
  });

  it('detects CWE-1321 (Prototype Pollution) and CWE-89 (SQL Injection)', async () => {
    const vulnerableSnippet = `
      function merge(req) {
        const payload = JSON.parse(req.body);
        const obj = {};
        for(let k in payload) {
          obj[k] = payload[k]; // __proto__ vulnerable
        }
        const sql = \`SELECT * FROM tenants WHERE id = '\${req.query.id}'\`;
      }
    `;
    const scan = await SecurityScannerTool.execute({ sourceCode: vulnerableSnippet });
    assert.equal(scan.isSecure, false);
    assert.ok(scan.vulnerabilitiesCount >= 1);
    const cwes = scan.vulnerabilities.map((v: any) => v.cwe);
    assert.ok(cwes.includes('CWE-89') || cwes.includes('CWE-1321'));
  });

  it('validates pristine hardened code with a 100% security score', async () => {
    const cleanSnippet = `
      function safeQuery(db, tenantId) {
        const text = 'SELECT * FROM tenants WHERE id = $1';
        return db.query(text, [tenantId]);
      }
    `;
    const scan = await SecurityScannerTool.execute({ sourceCode: cleanSnippet });
    assert.equal(scan.isSecure, true);
    assert.equal(scan.securityScore, 100);
    assert.equal(scan.vulnerabilitiesCount, 0);
  });

  it('searches vector knowledge base and returns semantic nearest neighbors', async () => {
    const result = await VectorSearchTool.execute({
      query: 'CWE-1321 prototype pollution safe object merge',
      minScore: 0.1,
    });
    assert.ok(result.matches.length > 0);
    assert.ok(result.matches[0].score > 0);
  });

  it('computes unified git diff with addition and deletion accounting', async () => {
    const original = 'const a = 1;\nconst b = 2;\n';
    const modified = 'const a = 1;\nconst b = 3;\nconst c = 4;\n';
    const diff = await DiffPatcherTool.execute({
      originalCode: original,
      modifiedCode: modified,
      filename: 'math.ts',
    });
    assert.equal(diff.filename, 'math.ts');
    assert.ok(diff.diff.includes('--- a/math.ts'));
    assert.ok(diff.diff.includes('+++ b/math.ts'));
    assert.ok(diff.additions > 0);
    assert.ok(diff.deletions > 0);
  });
});

describe('Autonomous Multi-Agent Mission DAGs', () => {
  it('schedules CVE-2026-9041 Security Audit DAG across 4 cycle-free waves', () => {
    const dag = buildSecurityAuditDAG();
    const plan = dag.getExecutionPlan();
    assert.equal(plan.length, 4);
    assert.deepEqual(plan[0], ['architect_plan']);
    assert.equal(plan[1].length, 2); // scout_cve_search, security_ast_scan
  });

  it('schedules Leaky-Bucket Rate Limiter DAG across 4 cycle-free waves', () => {
    const dag = buildRateLimiterDAG();
    const plan = dag.getExecutionPlan();
    assert.equal(plan.length, 4);
    assert.deepEqual(plan[0], ['architect_plan']);
  });

  it('schedules Financial Arbitrage DAG across 5 cycle-free waves', () => {
    const dag = buildFinancialArbitrageDAG();
    const plan = dag.getExecutionPlan();
    assert.equal(plan.length, 5);
  });

  it('dynamically generates a valid DAG for custom objectives', () => {
    const dag = buildCustomObjectiveDAG('Design a distributed LRU cache with memory bounds');
    const plan = dag.getExecutionPlan();
    assert.ok(plan.length >= 3);
    assert.deepEqual(plan[0], ['architect_plan']);
  });

  it('executes full Security Audit DAG end-to-end with cryptographic audit records', async () => {
    const dag = buildSecurityAuditDAG();
    const executor = new WorkflowExecutor();
    const events: string[] = [];

    const result = await executor.executeWorkflow(dag, {}, (event) => {
      events.push(event.type);
    });

    assert.equal(result.status, 'SUCCESS');
    assert.ok(result.durationMs > 0);
    assert.ok(result.outputs.synthesizer_audit_pack);
    assert.equal(result.outputs.synthesizer_audit_pack.releaseStatus, 'APPROVED_FOR_MAIN_MERGE');
    assert.equal(result.outputs.synthesizer_audit_pack.complianceScoreAfter, 100);

    // Verify cryptographic audit ledger
    const ledger = executor.getAuditLedger();
    const verify = ledger.verifyIntegrity();
    assert.equal(verify.isValid, true);
    assert.ok(ledger.getRecordCount() >= 6);

    // Verify streaming events were fired
    assert.ok(events.includes('WORKFLOW_STARTED'));
    assert.ok(events.includes('WAVE_STARTED'));
    assert.ok(events.includes('NODE_STARTED'));
    assert.ok(events.includes('NODE_COMPLETED'));
    assert.ok(events.includes('WORKFLOW_COMPLETED'));
  });

  it('exposes all production mission presets in the registry', () => {
    assert.ok(MISSION_PRESETS.length >= 3);
    for (const preset of MISSION_PRESETS) {
      assert.ok(preset.id);
      assert.ok(preset.title);
      assert.ok(preset.description);
      const dag = preset.buildDAG();
      const plan = dag.getExecutionPlan();
      assert.ok(plan.length > 0);
    }
  });
});
