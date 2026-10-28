/**
 * AgentForge - Production HTTP & Real-Time Streaming Server
 * 
 * Serves the AgentForge Studio Web Console, REST endpoints for mission dispatch,
 * and Server-Sent Events (SSE) for node-by-node execution streaming.
 * 
 * @author Dev <https://github.com/Dev-5678>
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WorkflowExecutor, WorkflowEvent } from '../runtime/executor.js';
import {
  MISSION_PRESETS,
  buildCustomObjectiveDAG,
} from '../agents/agent-system.js';
import { DistributedTracer } from '../telemetry/tracer.js';
import { ExecutionAuditLedger } from '../runtime/audit-ledger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createServer(port = 4000) {
  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // 1. Health & Diagnostics
    if (pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'HEALTHY',
          service: 'AgentForge Studio v2.0',
          engine: 'Kahn DAG Autonomous Multi-Agent Runtime',
          uptimeSec: Math.floor(process.uptime()),
          memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          availablePresets: MISSION_PRESETS.length,
          timestamp: Date.now(),
        })
      );
      return;
    }

    // 2. Mission Presets List
    if (pathname === '/api/presets' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const presets = MISSION_PRESETS.map((p) => ({
        id: p.id,
        title: p.title,
        badge: p.badge,
        badgeColor: p.badgeColor,
        category: p.category,
        description: p.description,
        estimatedSpeedup: p.estimatedSpeedup,
        nodesCount: p.nodesCount,
      }));
      res.end(JSON.stringify({ presets }));
      return;
    }

    // 3. Execute Mission (One-shot execution returning complete result, traces & audit ledger)
    if (pathname === '/api/missions/execute' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const { missionId, customObjective } = payload;

          let dag;
          let missionTitle = 'Custom Autonomous Mission';

          if (customObjective) {
            dag = buildCustomObjectiveDAG(String(customObjective));
            missionTitle = `Custom: ${String(customObjective).slice(0, 40)}...`;
          } else {
            const preset = MISSION_PRESETS.find((p) => p.id === missionId) || MISSION_PRESETS[0];
            dag = preset.buildDAG();
            missionTitle = preset.title;
          }

          const tracer = new DistributedTracer();
          const auditLedger = new ExecutionAuditLedger();
          const executor = new WorkflowExecutor(tracer, auditLedger);

          const result = await executor.executeWorkflow(dag, { missionTitle });
          const ledgerVerification = auditLedger.verifyIntegrity();

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              missionTitle,
              result,
              traces: tracer.exportTraceTree(),
              auditLedger: {
                verification: ledgerVerification,
                records: auditLedger.getRecords(),
              },
            })
          );
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // 4. Real-Time Streaming SSE Endpoint
    if (pathname === '/api/missions/stream' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });

      const missionId = url.searchParams.get('missionId') || 'cve_security_audit';
      const customObjective = url.searchParams.get('customObjective');

      let dag;
      if (customObjective) {
        dag = buildCustomObjectiveDAG(customObjective);
      } else {
        const preset = MISSION_PRESETS.find((p) => p.id === missionId) || MISSION_PRESETS[0];
        dag = preset.buildDAG();
      }

      const tracer = new DistributedTracer();
      const auditLedger = new ExecutionAuditLedger();
      const executor = new WorkflowExecutor(tracer, auditLedger);

      // Stream events as they fire
      const onEvent = (event: WorkflowEvent) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      try {
        const result = await executor.executeWorkflow(dag, {}, onEvent);
        const verification = auditLedger.verifyIntegrity();
        res.write(
          `data: ${JSON.stringify({
            type: 'STREAM_COMPLETE',
            result,
            verification,
            auditRecords: auditLedger.getRecords(),
          })}\n\n`
        );
      } catch (err: any) {
        res.write(
          `data: ${JSON.stringify({
            type: 'STREAM_ERROR',
            error: err.message,
          })}\n\n`
        );
      } finally {
        res.end();
      }
      return;
    }

    // 5. Serve Web Studio Dashboard
    if (pathname === '/' || pathname === '/dashboard' || pathname === '/index.html') {
      const htmlPath = path.resolve(__dirname, '../ui/dashboard.html');
      // If running from dist, resolve to original or copied ui
      let filePath = htmlPath;
      if (!fs.existsSync(filePath)) {
        filePath = path.resolve(process.cwd(), 'src/ui/dashboard.html');
      }

      if (fs.existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Endpoint not found: ${pathname}` }));
  });

  server.listen(port, () => {
    console.log(`================================================================`);
    console.log(`[AgentForge Studio v2.0] Engine listening on http://localhost:${port}`);
    console.log(`- Web Studio UI : http://localhost:${port}/`);
    console.log(`- Health Check  : http://localhost:${port}/health`);
    console.log(`- API Presets   : http://localhost:${port}/api/presets`);
    console.log(`================================================================`);
  });

  return server;
}

if (process.argv[1]?.endsWith('api.js')) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  createServer(port);
}
