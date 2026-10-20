/**
 * AgentForge - HTTP & Server-Sent Events (SSE) Streaming Server
 * 
 * Streams real-time DAG execution progress, span telemetry,
 * and agent tokens directly to connected dashboards.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import http from 'node:http';
import { WorkflowDAG } from '../dag/graph.js';
import { WorkflowExecutor } from '../runtime/executor.js';
import { DistributedTracer } from '../telemetry/tracer.js';

export function createServer(port = 4000) {
  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'HEALTHY', engine: 'AgentForge v1.0' }));
      return;
    }

    if (req.url === '/api/run-demo' && req.method === 'POST') {
      const tracer = new DistributedTracer();
      const executor = new WorkflowExecutor(tracer);

      // Build sample research & synthesis DAG
      const dag = new WorkflowDAG();
      dag
        .addNode({
          id: 'planner',
          name: 'Task Decomposition',
          agentRole: 'Lead Architect Agent',
          execute: async () => ({ subtasks: ['ingest_data', 'analyze_sentiments', 'audit_security'] }),
        })
        .addNode({
          id: 'ingest',
          name: 'Data Ingestion',
          agentRole: 'Crawler Agent',
          execute: async () => ({ recordsFetched: 1540 }),
        })
        .addNode({
          id: 'security_audit',
          name: 'Vulnerability Analysis',
          agentRole: 'Security Agent',
          execute: async () => ({ vulnerabilitiesFound: 0, complianceScore: 99.8 }),
        })
        .addNode({
          id: 'synthesizer',
          name: 'Executive Synthesis',
          agentRole: 'Chief Strategist Agent',
          execute: async (ctx) => ({
            summary: 'Pipeline executed cleanly with zero anomalies.',
            records: ctx.outputs.ingest.recordsFetched,
            compliance: ctx.outputs.security_audit.complianceScore,
          }),
        })
        .addEdge('planner', 'ingest')
        .addEdge('planner', 'security_audit')
        .addEdge('ingest', 'synthesizer')
        .addEdge('security_audit', 'synthesizer');

      const result = await executor.executeWorkflow(dag);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result, traces: tracer.exportTraceTree() }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  });

  server.listen(port, () => {
    console.log(`[AgentForge] Engine listening at http://localhost:${port}`);
  });

  return server;
}

if (process.argv[1]?.endsWith('api.js')) {
  createServer(4000);
}
