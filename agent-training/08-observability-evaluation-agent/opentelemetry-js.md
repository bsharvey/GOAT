---
archetypes: [karen]
skills: [observability, system-integration]
training_cluster: 08-observability-evaluation-agent
domain: observability
difficulty: advanced
version: 1.0
---
# OpenTelemetry JavaScript SDK

> Training documentation for the JARVIS Observability/Evaluation Agent.
> Source: https://opentelemetry.io/docs/languages/js/

---

## 1. Overview & Core Concepts

OpenTelemetry (OTel) is a vendor-neutral, open-source observability framework for generating, collecting, and exporting telemetry data (traces, metrics, logs). The JavaScript SDK supports both **Node.js** and **browser** environments.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Signal** | A category of telemetry: traces, metrics, or logs |
| **Provider** | Factory that creates signal-specific instruments (TracerProvider, MeterProvider, LoggerProvider) |
| **Exporter** | Sends telemetry data to a backend (OTLP, Jaeger, Zipkin, console, etc.) |
| **Processor** | Processes telemetry before export (batching, sampling, filtering) |
| **Resource** | Describes the entity producing telemetry (service name, version, environment) |
| **Context** | Carries trace context across async boundaries and services |
| **Propagator** | Serializes/deserializes context for inter-service communication |
| **Instrumentation** | Code that generates telemetry (auto or manual) |

---

## 2. Traces

A **trace** represents the entire journey of a request through a distributed system. It is composed of **spans**.

### Trace Structure

```
Trace
├── Span A (root span)
│   ├── Span B (child of A)
│   │   ├── Span C (child of B)
│   │   └── Span D (child of B)
│   └── Span E (child of A)
```

### Trace Context

Every trace has a globally unique `traceId`. Context propagation ensures all spans in a trace share the same `traceId`, even across service boundaries.

```
traceparent: 00-<traceId>-<spanId>-<traceFlags>
```

---

## 3. Spans

A **span** is a single unit of work within a trace. Each span captures:

| Attribute | Description |
|-----------|-------------|
| `name` | Human-readable operation name |
| `spanContext` | Contains `traceId`, `spanId`, `traceFlags` |
| `parentSpanId` | Links to the parent span |
| `kind` | `INTERNAL`, `SERVER`, `CLIENT`, `PRODUCER`, `CONSUMER` |
| `startTime` | Timestamp when the span started |
| `endTime` | Timestamp when the span ended |
| `attributes` | Key-value pairs with metadata |
| `events` | Time-stamped annotations (e.g., exceptions) |
| `links` | Causal relationships to other spans |
| `status` | `UNSET`, `OK`, or `ERROR` |

### Span Kinds

| Kind | Use Case |
|------|----------|
| `INTERNAL` | Default, internal operations |
| `SERVER` | Handling an incoming request |
| `CLIENT` | Making an outgoing request |
| `PRODUCER` | Creating a message for async processing |
| `CONSUMER` | Processing a message from a queue |

### Creating Spans

```typescript
import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service', '1.0.0');

// Basic span
const span = tracer.startSpan('operation-name');
span.setAttribute('key', 'value');
span.end();

// Span with options
const span = tracer.startSpan('http-request', {
  kind: SpanKind.CLIENT,
  attributes: {
    'http.method': 'GET',
    'http.url': 'https://api.example.com/data',
  },
});

try {
  const result = await fetch('https://api.example.com/data');
  span.setAttribute('http.status_code', result.status);
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  span.recordException(error);
} finally {
  span.end();
}
```

### Active Span Pattern (Recommended)

```typescript
// startActiveSpan automatically manages context propagation
await tracer.startActiveSpan('my-operation', async (span) => {
  try {
    // Any spans created here will be children of 'my-operation'
    const result = await doWork();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
});
```

### Span Events

```typescript
span.addEvent('cache-miss', {
  'cache.key': 'user:123',
  'cache.type': 'redis',
});

// Exception event (shorthand)
span.recordException(new Error('Something went wrong'));
```

### Span Links

```typescript
const linkedSpan = tracer.startSpan('batch-process', {
  links: [
    { context: producerSpan.spanContext() },
    { context: anotherSpan.spanContext(), attributes: { 'link.reason': 'retry' } },
  ],
});
```

---

## 4. Metrics

Metrics capture numerical measurements over time. OpenTelemetry supports three metric instrument types:

### Instrument Types

| Instrument | Type | Use Case |
|------------|------|----------|
| **Counter** | Monotonic sum | Request count, bytes sent |
| **UpDownCounter** | Non-monotonic sum | Active connections, queue size |
| **Histogram** | Distribution | Request latency, response sizes |
| **ObservableGauge** | Async gauge | CPU usage, memory usage |
| **ObservableCounter** | Async monotonic sum | Cumulative counters from external systems |
| **ObservableUpDownCounter** | Async non-monotonic sum | Connection pool sizes |

### Creating Metrics

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('my-service', '1.0.0');

// Counter
const requestCounter = meter.createCounter('http.requests.total', {
  description: 'Total number of HTTP requests',
  unit: 'requests',
});
requestCounter.add(1, { 'http.method': 'GET', 'http.route': '/api/users' });

// Histogram
const latencyHistogram = meter.createHistogram('http.request.duration', {
  description: 'HTTP request latency',
  unit: 'ms',
});
latencyHistogram.record(42.5, { 'http.method': 'POST', 'http.route': '/api/data' });

// UpDownCounter
const activeConnections = meter.createUpDownCounter('db.connections.active', {
  description: 'Number of active database connections',
});
activeConnections.add(1);  // connection opened
activeConnections.add(-1); // connection closed

// Observable Gauge (async)
meter.createObservableGauge('system.memory.usage', {
  description: 'Current memory usage in bytes',
  unit: 'bytes',
}).addCallback((result) => {
  result.observe(process.memoryUsage().heapUsed);
});
```

---

## 5. SDK Setup

### Installation

```bash
# Core API (types and no-op implementations)
npm install @opentelemetry/api

# Node.js SDK
npm install @opentelemetry/sdk-node

# Auto-instrumentations (HTTP, Express, pg, mysql, etc.)
npm install @opentelemetry/auto-instrumentations-node

# OTLP Exporters
npm install @opentelemetry/exporter-trace-otlp-http
npm install @opentelemetry/exporter-metrics-otlp-http
npm install @opentelemetry/exporter-logs-otlp-http

# Additional exporters
npm install @opentelemetry/exporter-trace-otlp-grpc
npm install @opentelemetry/exporter-trace-otlp-proto
```

### Basic Node.js Setup with SDK

```typescript
// tracing.ts - Must be imported BEFORE any other code
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'my-agent-service',
    [ATTR_SERVICE_VERSION]: '1.0.0',
    [ATTR_DEPLOYMENT_ENVIRONMENT]: 'production',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
    headers: { 'x-api-key': 'your-key' },
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 60000, // Export every 60 seconds
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy instrumentations
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OTel SDK shut down'))
    .catch((err) => console.error('Error shutting down OTel SDK', err))
    .finally(() => process.exit(0));
});
```

### Manual Setup (Without NodeSDK)

```typescript
import { trace, context, propagation } from '@opentelemetry/api';
import { BasicTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

// Set up propagation
propagation.setGlobalPropagator(new W3CTraceContextPropagator());

// Create provider
const provider = new BasicTracerProvider({
  resource: new Resource({
    'service.name': 'my-service',
  }),
});

// Add processor + exporter
provider.addSpanProcessor(
  new BatchSpanProcessor(
    new OTLPTraceExporter({ url: 'http://localhost:4318/v1/traces' }),
    {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    }
  )
);

// Register as global provider
provider.register();

// Now get a tracer anywhere
const tracer = trace.getTracer('my-module');
```

---

## 6. Instrumentation

### Auto-Instrumentation

Auto-instrumentation patches popular libraries to produce spans automatically:

```typescript
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// Includes instrumentation for:
// - HTTP/HTTPS (incoming + outgoing)
// - Express, Fastify, Koa, Hapi
// - pg, mysql, mysql2, mongodb, redis
// - gRPC
// - AWS SDK
// - And many more...

const instrumentations = getNodeAutoInstrumentations({
  '@opentelemetry/instrumentation-http': {
    requestHook: (span, request) => {
      span.setAttribute('custom.header', request.headers['x-custom'] || '');
    },
  },
  '@opentelemetry/instrumentation-express': {
    enabled: true,
  },
});
```

### Manual Instrumentation

```typescript
import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('agent-service', '1.0.0');

// Instrument an LLM call
async function callLLM(prompt: string, model: string): Promise<string> {
  return tracer.startActiveSpan('llm.call', {
    kind: SpanKind.CLIENT,
    attributes: {
      'gen_ai.system': 'anthropic',
      'gen_ai.request.model': model,
      'gen_ai.request.max_tokens': 4096,
    },
  }, async (span) => {
    try {
      const startTime = Date.now();
      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      span.setAttributes({
        'gen_ai.response.model': response.model,
        'gen_ai.usage.input_tokens': response.usage.input_tokens,
        'gen_ai.usage.output_tokens': response.usage.output_tokens,
        'gen_ai.response.finish_reasons': [response.stop_reason],
        'llm.latency_ms': Date.now() - startTime,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return response.content[0].text;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Context Propagation

```typescript
import { context, propagation, trace } from '@opentelemetry/api';

// Inject context into outgoing request headers
function makeRequest(url: string) {
  const headers: Record<string, string> = {};
  propagation.inject(context.active(), headers);
  // headers now contains 'traceparent' and optionally 'tracestate'
  return fetch(url, { headers });
}

// Extract context from incoming request
function handleRequest(incomingHeaders: Record<string, string>) {
  const extractedContext = propagation.extract(context.active(), incomingHeaders);
  return context.with(extractedContext, () => {
    // Spans created here will be part of the incoming trace
    const span = trace.getTracer('server').startSpan('handle-request');
    // ...
    span.end();
  });
}
```

### Custom Span Processor

```typescript
import { SpanProcessor, ReadableSpan } from '@opentelemetry/sdk-trace-base';

class SensitiveDataFilter implements SpanProcessor {
  onStart(span: any): void {
    // Can modify span on start
  }

  onEnd(span: ReadableSpan): void {
    // Filter or redact sensitive attributes before export
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}
```

---

## 7. Exporters

| Exporter | Protocol | Package |
|----------|----------|---------|
| OTLP/HTTP | HTTP/JSON or HTTP/Protobuf | `@opentelemetry/exporter-trace-otlp-http` |
| OTLP/gRPC | gRPC | `@opentelemetry/exporter-trace-otlp-grpc` |
| OTLP/Proto | HTTP/Protobuf | `@opentelemetry/exporter-trace-otlp-proto` |
| Console | stdout | `@opentelemetry/sdk-trace-base` (ConsoleSpanExporter) |
| Zipkin | HTTP/JSON | `@opentelemetry/exporter-zipkin` |

### Console Exporter (for debugging)

```typescript
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
```

---

## 8. Environment Variable Configuration

OpenTelemetry can be configured via environment variables:

```bash
# Service identification
OTEL_SERVICE_NAME=my-agent-service
OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0,deployment.environment=production

# Exporter configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=your-key
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

# Traces
OTEL_TRACES_EXPORTER=otlp
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.5

# Metrics
OTEL_METRICS_EXPORTER=otlp
OTEL_METRIC_EXPORT_INTERVAL=60000

# Logs
OTEL_LOGS_EXPORTER=otlp

# Propagators
OTEL_PROPAGATORS=tracecontext,baggage

# Batch processor tuning
OTEL_BSP_MAX_QUEUE_SIZE=2048
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=512
OTEL_BSP_SCHEDULE_DELAY=5000
OTEL_BSP_EXPORT_TIMEOUT=30000
```

---

## 9. Best Practices for Agent Observability

1. **Always use `startActiveSpan`** to ensure proper parent-child relationships.
2. **Set `service.name` resource attribute** on every provider - it is required for proper identification.
3. **Use `BatchSpanProcessor` in production** (not `SimpleSpanProcessor`) for performance.
4. **Record exceptions with `span.recordException()`** and set error status.
5. **Use semantic conventions** for attribute names (e.g., `http.method`, `db.system`).
6. **Shut down the SDK gracefully** to flush pending telemetry.
7. **Propagate context across service boundaries** using the propagation API.
8. **Sample appropriately** in production to control costs.
9. **Initialize tracing before importing application code** to ensure all libraries are instrumented.
10. **Use span links** to connect causally related traces (e.g., batch processing, retries).
