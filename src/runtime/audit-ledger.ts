/**
 * AgentForge - Cryptographic Execution Audit Ledger
 * 
 * Provides an immutable, append-only SHA-256 hash-chained ledger for workflow execution
 * audits. Guarantees non-repudiation and tamper detection across distributed autonomous
 * agent task lifecycles.
 * 
 * Chain formulation:
 * block_hash_n = SHA256(block_hash_{n-1} || stepId || status || timestamp || payload_hash)
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { createHash } from 'node:crypto';

export type StepAuditStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRYING';

export interface AuditRecord {
  index: number;
  stepId: string;
  workflowId: string;
  status: StepAuditStatus;
  timestamp: number;
  payloadHash: string;
  previousHash: string;
  hash: string;
}

export interface VerificationResult {
  isValid: boolean;
  totalRecords: number;
  corruptedIndex?: number;
  error?: string;
}

export class ExecutionAuditLedger {
  private chain: AuditRecord[];
  private static readonly GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

  constructor() {
    this.chain = [];
  }

  /**
   * Computes deterministic SHA-256 hash of an arbitrary payload
   */
  public static hashPayload(payload: unknown): string {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Computes block header hash
   */
  private computeBlockHash(
    index: number,
    stepId: string,
    workflowId: string,
    status: StepAuditStatus,
    timestamp: number,
    payloadHash: string,
    previousHash: string
  ): string {
    const raw = `${index}:${workflowId}:${stepId}:${status}:${timestamp}:${payloadHash}:${previousHash}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Appends an audit event to the tamper-evident chain
   */
  public record(
    workflowId: string,
    stepId: string,
    status: StepAuditStatus,
    payload?: unknown,
    timestamp: number = Date.now()
  ): AuditRecord {
    const index = this.chain.length;
    const previousHash = index === 0 ? ExecutionAuditLedger.GENESIS_HASH : this.chain[index - 1].hash;
    const payloadHash = ExecutionAuditLedger.hashPayload(payload);

    const hash = this.computeBlockHash(
      index,
      stepId,
      workflowId,
      status,
      timestamp,
      payloadHash,
      previousHash
    );

    const record: AuditRecord = {
      index,
      stepId,
      workflowId,
      status,
      timestamp,
      payloadHash,
      previousHash,
      hash,
    };

    this.chain.push(record);
    return record;
  }

  /**
   * Verifies the cryptographic integrity of the entire ledger chain
   */
  public verifyIntegrity(): VerificationResult {
    if (this.chain.length === 0) {
      return { isValid: true, totalRecords: 0 };
    }

    for (let i = 0; i < this.chain.length; i++) {
      const current = this.chain[i];

      // Verify genesis previous hash
      if (i === 0 && current.previousHash !== ExecutionAuditLedger.GENESIS_HASH) {
        return {
          isValid: false,
          totalRecords: this.chain.length,
          corruptedIndex: 0,
          error: 'Genesis block previous hash is invalid',
        };
      }

      // Verify previous hash linkage
      if (i > 0 && current.previousHash !== this.chain[i - 1].hash) {
        return {
          isValid: false,
          totalRecords: this.chain.length,
          corruptedIndex: i,
          error: `Broken hash chain between block ${i - 1} and ${i}`,
        };
      }

      // Recompute and verify current block hash
      const expectedHash = this.computeBlockHash(
        current.index,
        current.stepId,
        current.workflowId,
        current.status,
        current.timestamp,
        current.payloadHash,
        current.previousHash
      );

      if (current.hash !== expectedHash) {
        return {
          isValid: false,
          totalRecords: this.chain.length,
          corruptedIndex: i,
          error: `Tampered hash at block ${i}`,
        };
      }
    }

    return { isValid: true, totalRecords: this.chain.length };
  }

  public getRecords(): readonly AuditRecord[] {
    return this.chain;
  }

  public getRecordCount(): number {
    return this.chain.length;
  }
}
