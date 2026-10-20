/**
 * AgentForge - OpenTelemetry Distributed Span Tracer
 * 
 * Captures execution hierarchy, latency profiles, token metrics,
 * and error diagnostics across multi-agent DAG pipelines.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export interface SpanAttributes {
  [key: string]: any;
}

export class TraceSpan {
  public readonly id: string;
  public readonly name: string;
  public readonly parentId?: string;
  public readonly startTime: number;
  public endTime?: number;
  public durationMs?: number;
  public attributes: SpanAttributes;
  public status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' = 'RUNNING';

  constructor(name: string, attributes: SpanAttributes = {}, parentId?: string) {
    this.id = `span-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.name = name;
    this.parentId = parentId;
    this.startTime = performance.now();
    this.attributes = { ...attributes };
  }

  public end(finalAttributes: SpanAttributes = {}): void {
    this.endTime = performance.now();
    this.durationMs = this.endTime - this.startTime;
    this.attributes = { ...this.attributes, ...finalAttributes };
    if (finalAttributes.status) {
      this.status = finalAttributes.status;
    } else {
      this.status = 'COMPLETED';
    }
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      parentId: this.parentId,
      durationMs: this.durationMs ? Number(this.durationMs.toFixed(2)) : undefined,
      status: this.status,
      attributes: this.attributes,
    };
  }
}

export class DistributedTracer {
  private spans: TraceSpan[] = [];

  public startSpan(name: string, attributes?: SpanAttributes, parentId?: string): TraceSpan {
    const span = new TraceSpan(name, attributes, parentId);
    this.spans.push(span);
    return span;
  }

  public getSpans(): TraceSpan[] {
    return [...this.spans];
  }

  public clear(): void {
    this.spans = [];
  }

  public exportTraceTree(): any {
    return this.spans.map((s) => s.toJSON());
  }
}
