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
export class ZipkinSpanFormatter {
  public static format(span: TraceSpan): Record<string, any> {
    return {
      id: span.id,
      name: span.name,
      timestamp: Math.floor(span.startTime * 1000),
      duration: Math.floor((span.durationMs || 0) * 1000),
      tags: span.attributes,
    };
  }
}