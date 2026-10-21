/**
 * AgentForge - OpenTelemetry Jaeger & Zipkin Span Exporters
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { TraceSpan } from './tracer.js';

export interface JaegerSpan {
  traceId: string;
  spanId: string;
  operationName: string;
  startTime: number;
  duration: number;
  tags: Array<{ key: string; type: string; value: any }>;
}