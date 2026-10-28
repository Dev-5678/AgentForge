/**
 * AgentForge - Cryptographic Audit Ledger Unit Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ExecutionAuditLedger } from '../src/runtime/audit-ledger.js';

describe('Cryptographic Execution Audit Ledger', () => {
  it('appends audit records and chains SHA-256 hashes sequentially', () => {
    const ledger = new ExecutionAuditLedger();

    const r1 = ledger.record('wf-101', 'step-extract', 'RUNNING', { rows: 50 });
    const r2 = ledger.record('wf-101', 'step-extract', 'COMPLETED', { rows: 50, valid: 50 });
    const r3 = ledger.record('wf-101', 'step-transform', 'RUNNING');

    assert.strictEqual(r1.index, 0);
    assert.strictEqual(r2.index, 1);
    assert.strictEqual(r3.index, 2);

    assert.strictEqual(r2.previousHash, r1.hash);
    assert.strictEqual(r3.previousHash, r2.hash);
    assert.strictEqual(ledger.getRecordCount(), 3);
  });

  it('validates pristine ledger chains successfully', () => {
    const ledger = new ExecutionAuditLedger();
    ledger.record('wf-102', 'step-init', 'QUEUED');
    ledger.record('wf-102', 'step-init', 'RUNNING');
    ledger.record('wf-102', 'step-init', 'COMPLETED', { exitCode: 0 });

    const verification = ledger.verifyIntegrity();
    assert.strictEqual(verification.isValid, true);
    assert.strictEqual(verification.totalRecords, 3);
    assert.strictEqual(verification.corruptedIndex, undefined);
  });

  it('detects tampering when an internal block payload is modified', () => {
    const ledger = new ExecutionAuditLedger();
    ledger.record('wf-103', 'step-auth', 'RUNNING');
    ledger.record('wf-103', 'step-auth', 'COMPLETED', { authorized: false });
    ledger.record('wf-103', 'step-final', 'COMPLETED');

    // Tamper with record at index 1
    const records = ledger.getRecords() as any[];
    records[1].payloadHash = 'tampered-hash-value-000000000000000000000000000000000000000000';

    const verification = ledger.verifyIntegrity();
    assert.strictEqual(verification.isValid, false);
    assert.strictEqual(verification.corruptedIndex, 1);
    assert.ok(verification.error?.includes('Tampered hash'));
  });
});
