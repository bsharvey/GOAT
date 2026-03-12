---
archetypes: [karen, jarvis]
skills: [observability, diagnostic-reasoning]
training_cluster: 08-observability-evaluation-agent
domain: observability
difficulty: intermediate
version: 1.0
---
# Cloudflare Workers Observability

> Training documentation for the JARVIS Observability/Evaluation Agent.
> Source: https://developers.cloudflare.com/workers/observability/

---

## 1. Overview

Cloudflare Workers run on the edge in a V8 isolate model, which requires specialized observability approaches. Workers do not have traditional long-running processes, so standard APM agents are not directly applicable. Cloudflare provides several built-in observability features plus integration points for external tools.

### Observability Stack

| Feature | Description | Use Case |
|---------|-------------|----------|
| **Workers Analytics** | Built-in metrics dashboard | Request volume, error rates, CPU time |
| **`console.log()`** | Real-time log streaming | Development debugging |
| **Tail Workers** | Event-driven log processing | Production log pipelines |
| **Logpush** | Log export to external destinations | Long-term storage, SIEM integration |
| **Workers Trace Events** | Structured execution data | Detailed per-request telemetry |
| **Live Tail** | Real-time log viewer in dashboard | Live debugging |
| **Wrangler tail** | CLI real-time log streaming | Local development debugging |

---

## 2. Workers Analytics Engine

### Built-in Dashboard Metrics

The Workers dashboard automatically tracks:

| Metric | Description |
|--------|-------------|
| **Requests** | Total requests, success/error breakdown |
| **Errors** | 4xx and 5xx responses, uncaught exceptions |
| **CPU Time** | Wall-clock CPU time per request (p50, p75, p99) |
| **Duration** | Total request duration including I/O |
| **Data Transfer** | Bytes in/out |
| **Subrequests** | Fetch calls made by the Worker |
| **Cron Triggers** | Scheduled execution metrics |

### Custom Analytics with Workers Analytics Engine

For custom metrics, use the Workers Analytics Engine binding:

```toml
# wrangler.toml
[[analytics_engine_datasets]]
binding = "ANALYTICS"
```

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startTime = Date.now();

    // ... handle request ...

    const duration = Date.now() - startTime;

    // Write custom analytics data point
    env.ANALYTICS.writeDataPoint({
      blobs: [
        request.url,                          // blob1: URL
        request.headers.get('cf-country'),    // blob2: country
        'success',                            // blob3: status
      ],
      doubles: [
        duration,        // double1: latency in ms
        responseSize,    // double2: response size in bytes
        tokenCount,      // double3: custom metric (e.g., LLM tokens)
      ],
      indexes: [
        request.cf?.colo || 'unknown',  // index1: colo for filtering
      ],
    });

    return response;
  },
};
```

### Querying Analytics Engine

```sql
-- Query via the Analytics Engine SQL API
SELECT
  blob1 AS url,
  blob3 AS status,
  COUNT() AS request_count,
  AVG(double1) AS avg_latency_ms,
  quantilesMerge(0.99)(double1) AS p99_latency_ms,
  SUM(double3) AS total_tokens
FROM ANALYTICS
WHERE timestamp > NOW() - INTERVAL '1' HOUR
GROUP BY url, status
ORDER BY request_count DESC
LIMIT 20
```

---

## 3. Logging

### 3.1 console.log() in Workers

Workers support standard console methods. Logs are ephemeral by default (visible only during `wrangler tail` or in the dashboard live tail).

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Standard log levels
    console.log('Processing request:', request.url);
    console.info('Request method:', request.method);
    console.warn('Approaching rate limit');
    console.error('Failed to process:', error.message);
    console.debug('Debug details:', { headers: Object.fromEntries(request.headers) });

    // Structured logging (objects are JSON-serialized)
    console.log(JSON.stringify({
      level: 'info',
      message: 'LLM call completed',
      traceId: 'abc-123',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 150,
      outputTokens: 500,
      latencyMs: 1200,
      timestamp: new Date().toISOString(),
    }));

    return new Response('OK');
  },
};
```

### 3.2 Wrangler Tail (CLI)

Stream real-time logs from a deployed Worker:

```bash
# Stream logs from a Worker
wrangler tail my-worker

# With filters
wrangler tail my-worker --status error    # Only errors
wrangler tail my-worker --method POST     # Only POST requests
wrangler tail my-worker --search "LLM"    # Text search in logs
wrangler tail my-worker --ip self         # Only your IP
wrangler tail my-worker --format json     # JSON output for piping

# Sampling (for high-traffic Workers)
wrangler tail my-worker --sampling-rate 0.1  # 10% of requests
```

### 3.3 Live Tail in Dashboard

The Cloudflare dashboard provides a real-time log viewer under **Workers & Pages > your-worker > Logs > Begin log stream**. This shows:
- Request URL, method, status
- Console log output
- Exceptions
- CPU time

---

## 4. Tail Workers

Tail Workers are specialized Workers that receive log events from other Workers. They run after the main Worker has responded, making them ideal for non-blocking log processing.

### Architecture

```
Client Request
    │
    ▼
Producer Worker (handles request, responds to client)
    │
    ├── Logs, exceptions, trace events
    │
    ▼
Tail Worker (processes logs asynchronously)
    │
    ├── Forward to logging service
    ├── Send to analytics
    ├── Alert on errors
    └── Store in R2/D1/KV
```

### Configuration

```toml
# wrangler.toml for the PRODUCER Worker
name = "my-agent-worker"
main = "src/index.ts"

# Attach a Tail Worker
tail_consumers = [
  { service = "my-log-processor" }
]
```

### Tail Worker Implementation

```typescript
// src/tail-worker.ts
export interface TailEvent {
  readonly scriptName: string;
  readonly scriptVersion?: string;
  readonly event:
    | FetchEventInfo
    | ScheduledEventInfo
    | AlarmEventInfo
    | QueueEventInfo;
  readonly eventTimestamp: number;
  readonly logs: TailLog[];
  readonly exceptions: TailException[];
  readonly outcome: string; // 'ok', 'exception', 'exceededCpu', 'exceededMemory', 'canceled'
}

interface TailLog {
  readonly message: any[];
  readonly level: string;  // 'log', 'warn', 'error', 'info', 'debug'
  readonly timestamp: number;
}

interface TailException {
  readonly name: string;
  readonly message: string;
  readonly timestamp: number;
}

interface FetchEventInfo {
  readonly request: {
    readonly url: string;
    readonly method: string;
    readonly headers: Record<string, string>;
    readonly cf?: object;
  };
  readonly response?: {
    readonly status: number;
  };
}

export default {
  async tail(events: TailEvent[], env: Env, ctx: ExecutionContext): Promise<void> {
    for (const event of events) {
      // Process each trace event
      const logEntry = {
        timestamp: new Date(event.eventTimestamp).toISOString(),
        worker: event.scriptName,
        outcome: event.outcome,
        request: event.event.type === 'fetch' ? {
          url: (event.event as FetchEventInfo).request.url,
          method: (event.event as FetchEventInfo).request.method,
          status: (event.event as FetchEventInfo).response?.status,
        } : undefined,
        logs: event.logs.map(log => ({
          level: log.level,
          message: log.message,
          timestamp: new Date(log.timestamp).toISOString(),
        })),
        exceptions: event.exceptions.map(exc => ({
          name: exc.name,
          message: exc.message,
          timestamp: new Date(exc.timestamp).toISOString(),
        })),
      };

      // Forward to external logging service
      ctx.waitUntil(
        fetch('https://logs.example.com/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry),
        })
      );

      // Alert on errors
      if (event.outcome !== 'ok' || event.exceptions.length > 0) {
        ctx.waitUntil(sendAlert(logEntry, env));
      }
    }
  },
};
```

### Tail Worker for Langfuse Integration

```typescript
// Tail Worker that forwards LLM traces to Langfuse
export default {
  async tail(events: TailEvent[], env: Env, ctx: ExecutionContext): Promise<void> {
    const langfuseEvents: any[] = [];

    for (const event of events) {
      // Extract structured log entries that contain trace data
      for (const log of event.logs) {
        const message = log.message[0];
        if (typeof message === 'string') {
          try {
            const parsed = JSON.parse(message);
            if (parsed.type === 'langfuse-trace') {
              langfuseEvents.push(parsed);
            }
          } catch {
            // Not JSON, skip
          }
        }
      }
    }

    if (langfuseEvents.length > 0) {
      ctx.waitUntil(
        fetch(`${env.LANGFUSE_HOST}/api/public/ingestion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${btoa(`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`)}`,
          },
          body: JSON.stringify({ batch: langfuseEvents }),
        })
      );
    }
  },
};
```

---

## 5. Logpush

Logpush exports Worker trace events to external destinations for long-term storage and analysis.

### Supported Destinations

| Destination | Use Case |
|-------------|----------|
| **R2** | Cloudflare object storage |
| **S3** | AWS S3 buckets |
| **Google Cloud Storage** | GCS buckets |
| **Azure Blob Storage** | Azure storage |
| **Sumo Logic** | Log analytics |
| **Datadog** | Monitoring platform |
| **Splunk** | SIEM/log analytics |
| **New Relic** | Observability platform |
| **HTTP endpoint** | Custom webhook |

### Configuration via API

```bash
# Create a Logpush job for Workers trace events
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/logpush/jobs" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "workers-traces",
    "output_options": {
      "field_names": [
        "Event",
        "EventTimestampMs",
        "Outcome",
        "Exceptions",
        "Logs",
        "ScriptName",
        "ScriptVersion"
      ],
      "timestamp_format": "rfc3339"
    },
    "destination_conf": "r2://my-logs-bucket/workers-traces/{DATE}",
    "dataset": "workers_trace_events",
    "enabled": true
  }'
```

### Workers Trace Events Fields

| Field | Description |
|-------|-------------|
| `Event` | Request details (URL, method, status, etc.) |
| `EventTimestampMs` | When the event occurred |
| `EventType` | `fetch`, `scheduled`, `alarm`, `queue`, etc. |
| `Outcome` | `ok`, `exception`, `exceededCpu`, `canceled`, etc. |
| `Exceptions` | Array of exception objects |
| `Logs` | Array of console log entries |
| `ScriptName` | Worker name |
| `ScriptVersion` | Worker script version/tag |
| `DispatchNamespace` | Workers for Platforms namespace |
| `ScriptTags` | Custom script tags |

---

## 6. Debugging Patterns

### 6.1 Request Tracing Pattern

```typescript
import { v4 as uuidv4 } from 'uuid';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const traceId = request.headers.get('x-trace-id') || uuidv4();
    const startTime = Date.now();

    // Create a trace context that flows through the request
    const trace = {
      id: traceId,
      spans: [] as any[],
      log(name: string, data?: any) {
        const entry = {
          name,
          timestamp: Date.now(),
          elapsed: Date.now() - startTime,
          ...data,
        };
        this.spans.push(entry);
        console.log(JSON.stringify({ traceId, ...entry }));
      },
    };

    try {
      trace.log('request-start', {
        url: request.url,
        method: request.method,
      });

      // Process the request with tracing
      const result = await processWithTracing(request, env, trace);

      trace.log('request-end', {
        status: 200,
        duration: Date.now() - startTime,
      });

      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': traceId,
          'X-Duration-Ms': String(Date.now() - startTime),
        },
      });
    } catch (error) {
      trace.log('request-error', {
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({ error: error.message, traceId }),
        { status: 500, headers: { 'X-Trace-Id': traceId } }
      );
    }
  },
};
```

### 6.2 Subrequest Tracking

```typescript
// Wrapper for tracking all fetch() subrequests
function tracedFetch(trace: TraceContext) {
  return async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.url;
    const method = init?.method || 'GET';

    trace.log('subrequest-start', { url, method });
    const start = Date.now();

    try {
      const response = await fetch(input, init);
      trace.log('subrequest-end', {
        url,
        method,
        status: response.status,
        duration: Date.now() - start,
      });
      return response;
    } catch (error) {
      trace.log('subrequest-error', {
        url,
        method,
        error: error.message,
        duration: Date.now() - start,
      });
      throw error;
    }
  };
}
```

### 6.3 Error Tracking with Context

```typescript
// Structured error tracking
class WorkerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context: Record<string, any> = {},
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'WorkerError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      retryable: this.retryable,
      stack: this.stack,
    };
  }
}

// Usage
try {
  const result = await callExternalAPI();
} catch (error) {
  throw new WorkerError(
    'External API call failed',
    'EXTERNAL_API_ERROR',
    {
      endpoint: 'https://api.anthropic.com/v1/messages',
      statusCode: error.status,
      retryAfter: error.headers?.get('retry-after'),
    },
    error.status === 429 || error.status >= 500,
  );
}
```

---

## 7. Performance Monitoring

### 7.1 CPU Time Tracking

```typescript
// Workers have CPU time limits:
// - Free plan: 10ms CPU time
// - Paid plan: 30s CPU time (50ms for cron triggers on free plan)
// - Note: I/O wait (fetch, KV, D1) does NOT count against CPU time

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cpuStart = Date.now();

    // CPU-intensive work
    const processed = heavyComputation(data);

    const cpuTime = Date.now() - cpuStart;
    console.log(JSON.stringify({
      type: 'performance',
      cpuTimeMs: cpuTime,
      warning: cpuTime > 20 ? 'HIGH_CPU' : undefined,
    }));

    return new Response(processed);
  },
};
```

### 7.2 Memory Usage Awareness

```typescript
// Workers have a 128MB memory limit
// Track large allocations
function trackMemory(label: string) {
  // Note: performance.measureUserAgentSpecificMemory() is not available in Workers
  // Instead, track known large allocations manually
  console.log(JSON.stringify({
    type: 'memory-checkpoint',
    label,
    timestamp: Date.now(),
  }));
}
```

### 7.3 Latency Breakdown

```typescript
async function handleWithLatencyBreakdown(request: Request, env: Env) {
  const timings: Record<string, number> = {};
  const measure = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    const result = await fn();
    timings[name] = Date.now() - start;
    return result;
  };

  const context = await measure('retrieval', () => retrieveContext(env));
  const embedding = await measure('embedding', () => generateEmbedding(context));
  const llmResponse = await measure('llm-call', () => callLLM(embedding, env));
  const formatted = await measure('formatting', () => formatResponse(llmResponse));

  console.log(JSON.stringify({
    type: 'latency-breakdown',
    timings,
    totalMs: Object.values(timings).reduce((a, b) => a + b, 0),
  }));

  return formatted;
}
```

---

## 8. Workers + OpenTelemetry

While Workers do not support the full Node.js OTel SDK, you can export OTel-compatible data:

### 8.1 Manual OTLP Export

```typescript
// Manually construct and export OTLP spans from Workers
interface OTLPSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Array<{ key: string; value: { stringValue?: string; intValue?: string } }>;
  status: { code: number; message?: string };
}

function createOTLPSpan(opts: {
  traceId: string;
  name: string;
  startMs: number;
  endMs: number;
  attributes: Record<string, string | number>;
  parentSpanId?: string;
  error?: string;
}): OTLPSpan {
  const spanId = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

  return {
    traceId: opts.traceId,
    spanId,
    parentSpanId: opts.parentSpanId,
    name: opts.name,
    kind: 1, // SPAN_KIND_INTERNAL
    startTimeUnixNano: String(opts.startMs * 1_000_000),
    endTimeUnixNano: String(opts.endMs * 1_000_000),
    attributes: Object.entries(opts.attributes).map(([key, value]) => ({
      key,
      value: typeof value === 'number'
        ? { intValue: String(value) }
        : { stringValue: value },
    })),
    status: opts.error
      ? { code: 2, message: opts.error }
      : { code: 1 },
  };
}

// Export spans via OTLP HTTP
async function exportSpans(spans: OTLPSpan[], env: Env) {
  const payload = {
    resourceSpans: [{
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: 'jarvis-worker' } },
          { key: 'deployment.environment', value: { stringValue: env.ENVIRONMENT } },
        ],
      },
      scopeSpans: [{
        scope: { name: 'jarvis-worker', version: '1.0.0' },
        spans,
      }],
    }],
  };

  await fetch(`${env.OTEL_ENDPOINT}/v1/traces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...env.OTEL_HEADERS,
    },
    body: JSON.stringify(payload),
  });
}
```

### 8.2 Using otel-cf-workers Library

The community `otel-cf-workers` package provides a lighter-weight OTel integration for Workers:

```typescript
// Using @microlabs/otel-cf-workers
import { instrument, ResolveConfigFn } from '@microlabs/otel-cf-workers';

const handler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Your worker code - automatically traced
    const result = await processRequest(request, env);
    return new Response(JSON.stringify(result));
  },
};

const config: ResolveConfigFn = (env: Env) => ({
  exporter: {
    url: env.OTEL_EXPORTER_URL,
    headers: { 'x-api-key': env.OTEL_API_KEY },
  },
  service: {
    name: 'jarvis-agent-worker',
    version: '1.0.0',
  },
});

export default instrument(handler, config);
```

---

## 9. Alerting Patterns

### 9.1 Error Rate Monitoring via Tail Worker

```typescript
// Tail Worker that monitors error rates and sends alerts
export default {
  async tail(events: TailEvent[], env: Env, ctx: ExecutionContext): Promise<void> {
    const errors = events.filter(e => e.outcome !== 'ok');
    const errorRate = errors.length / events.length;

    // Alert if error rate exceeds threshold
    if (errorRate > 0.05 && events.length > 10) {
      ctx.waitUntil(
        fetch(env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert: 'High error rate detected',
            errorRate: `${(errorRate * 100).toFixed(1)}%`,
            sampleSize: events.length,
            errors: errors.slice(0, 5).map(e => ({
              worker: e.scriptName,
              outcome: e.outcome,
              exceptions: e.exceptions,
            })),
            timestamp: new Date().toISOString(),
          }),
        })
      );
    }

    // Alert on specific exception patterns
    for (const event of events) {
      for (const exception of event.exceptions) {
        if (exception.message.includes('rate limit') ||
            exception.message.includes('quota exceeded')) {
          ctx.waitUntil(sendRateLimitAlert(exception, env));
        }
      }
    }
  },
};
```

---

## 10. Best Practices

1. **Use structured JSON logging** - Always `console.log(JSON.stringify({...}))` for machine-parseable logs.
2. **Include trace IDs everywhere** - Propagate `x-trace-id` headers across subrequests.
3. **Use Tail Workers for production logging** - Non-blocking, does not impact response latency.
4. **Set up Logpush for retention** - Console logs are ephemeral; use Logpush for durable storage.
5. **Monitor CPU time** - CPU limits are strict; track and alert on high CPU usage.
6. **Use `ctx.waitUntil()` for async telemetry** - Ensures telemetry is sent after response without delaying the client.
7. **Sample in high-traffic scenarios** - Use sampling for `wrangler tail` and custom analytics.
8. **Tag script versions** - Use `ScriptVersion` / script tags for deployment tracking.
9. **Export OTLP data via Tail Workers** - Keep the main Worker fast; process telemetry asynchronously.
10. **Test observability in development** - Use `wrangler tail` and `wrangler dev` to verify logging before deployment.
