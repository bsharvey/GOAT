---
archetypes: [jarvis]
skills: [infrastructure, system-integration, deployment-orchestration]
training_cluster: 01-infrastructure-architect
domain: infrastructure
difficulty: intermediate
version: 1.0
---
# Cloudflare Workers - Training Reference

> Training material for JARVIS Infrastructure Architect agent.
> Source: https://developers.cloudflare.com/workers/

---

## 1. Overview

Cloudflare Workers is a serverless execution environment that runs JavaScript, TypeScript, WebAssembly, Python, and Rust on Cloudflare's global edge network (300+ data centers). Workers use the V8 JavaScript engine (the same engine that powers Chrome and Node.js) but do **not** run Node.js. They execute in an isolate-based model rather than container-based, providing near-zero cold start times.

### Key Value Propositions
- **Edge-first execution**: Code runs within milliseconds of the end user
- **No cold starts**: V8 isolates spin up in under 5ms (vs. 200-500ms for containers)
- **Scale-to-zero**: No charges when no requests are being served (on the standard pricing model)
- **Global by default**: Deployed to all Cloudflare data centers simultaneously

---

## 2. Runtime Model

### Isolate Architecture
Unlike traditional serverless (AWS Lambda, GCP Cloud Functions) which uses per-request containers, Workers use **V8 isolates**:

```
┌─────────────────────────────────────────┐
│           V8 Engine Process             │
│  ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ Isolate  │ │ Isolate  │ │Isolate │  │
│  │ Worker A │ │ Worker B │ │Worker C│  │
│  └──────────┘ └──────────┘ └────────┘  │
│  Shared engine, separate heaps/scopes   │
└─────────────────────────────────────────┘
```

- Each Worker runs in its own isolate with its own global scope
- Isolates share the V8 engine process but have **memory isolation**
- Startup time: ~5ms (vs. 200ms+ for container cold starts)
- No file system access (except through bindings like R2, KV)

### Execution Model
Workers are event-driven. The primary event is the `fetch` event:

```javascript
export default {
  async fetch(request, env, ctx) {
    // request: incoming Request object (Web Standards API)
    // env: bindings (KV, R2, D1, DO, Queues, secrets, vars)
    // ctx: execution context (waitUntil, passThroughOnException)
    return new Response("Hello World");
  },
};
```

### Other Event Handlers

```javascript
export default {
  // HTTP requests
  async fetch(request, env, ctx) { ... },

  // Cron Triggers (scheduled events)
  async scheduled(event, env, ctx) {
    // event.cron: the cron pattern that triggered this
    // event.scheduledTime: the scheduled time (epoch ms)
    ctx.waitUntil(doWork());
  },

  // Queue consumer
  async queue(batch, env) {
    // batch.messages: array of messages
    for (const msg of batch.messages) {
      console.log(msg.body);
      msg.ack();
    }
  },

  // Email handler
  async email(message, env, ctx) { ... },

  // Tail handler (for logging/observability)
  async tail(events, env, ctx) { ... },
};
```

---

## 3. Web Standards APIs

Workers implement a large subset of Web Standards APIs:

| API | Description |
|-----|-------------|
| `fetch()` | Make outbound HTTP requests |
| `Request` / `Response` | Standard HTTP objects |
| `Headers` | HTTP headers manipulation |
| `URL` / `URLSearchParams` | URL parsing |
| `TextEncoder` / `TextDecoder` | Text encoding |
| `crypto` / `crypto.subtle` | Web Crypto API |
| `ReadableStream` / `WritableStream` | Streams API |
| `WebSocket` | WebSocket client/server |
| `structuredClone()` | Deep cloning |
| `setTimeout` / `setInterval` | Timers (limited in scope) |
| `AbortController` / `AbortSignal` | Request cancellation |
| `navigator.userAgent` | Returns `"Cloudflare-Workers"` |
| `FormData` | Multipart form data |
| `Blob` / `File` | Binary data types |
| `Cache` | Cache API (Cloudflare-specific extensions) |
| `HTMLRewriter` | Streaming HTML parser/transformer |

### Node.js Compatibility
Workers now support a growing set of Node.js APIs via the `nodejs_compat` compatibility flag:

```toml
# wrangler.toml
compatibility_flags = ["nodejs_compat"]
```

Supported Node.js modules (partial list):
- `node:buffer`
- `node:crypto`
- `node:util`
- `node:stream`
- `node:events`
- `node:assert`
- `node:path`
- `node:string_decoder`
- `node:diagnostics_channel`
- `node:async_hooks` (AsyncLocalStorage)

---

## 4. Limits

### CPU Time Limits

| Plan | CPU Time per Request | Duration (wall clock) |
|------|--------------------|-----------------------|
| Free | 10 ms | No hard limit* |
| Paid (Bundled) | 50 ms | No hard limit* |
| Paid (Unbound) | 30 seconds | No hard limit* |
| Paid (Standard) | 30 seconds | No hard limit* |

*Wall clock duration is not limited, but you pay for CPU time and external subrequest wait time does not count against CPU time.

### Other Limits

| Resource | Free | Paid |
|----------|------|------|
| Worker size (compressed) | 1 MB | 10 MB |
| Worker size (uncompressed) | 5 MB | 30 MB |
| Memory per isolate | 128 MB | 128 MB |
| Environment variables | 64 | 128 |
| Environment variable size | 5 KB each | 5 KB each |
| Subrequests per request | 50 | 1,000 |
| Simultaneous outgoing connections | 6 | 6 |
| Request body size | 100 MB | 500 MB |
| Response body size | No limit (streaming) | No limit (streaming) |
| KV reads per request | 1,000 | 1,000 |
| Number of Workers | 100 | 500 |
| Number of Cron Triggers | 3 per Worker | 5 per Worker |
| Cron Trigger interval | 1 min minimum | 1 min minimum |

---

## 5. Bindings

Bindings connect your Worker to external resources. They are configured in `wrangler.toml` and injected via the `env` parameter.

### 5.1 KV (Key-Value Store)

Globally distributed, eventually-consistent key-value store.

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "MY_KV"
id = "abc123"
```

```javascript
export default {
  async fetch(request, env) {
    // Write
    await env.MY_KV.put("key", "value", {
      expirationTtl: 3600,  // seconds
      metadata: { created: Date.now() },
    });

    // Read
    const value = await env.MY_KV.get("key");
    const withMeta = await env.MY_KV.getWithMetadata("key");
    // withMeta.value, withMeta.metadata

    // Read as different types
    const json = await env.MY_KV.get("key", { type: "json" });
    const buf = await env.MY_KV.get("key", { type: "arrayBuffer" });
    const stream = await env.MY_KV.get("key", { type: "stream" });

    // Delete
    await env.MY_KV.delete("key");

    // List keys
    const list = await env.MY_KV.list({ prefix: "user:", limit: 100 });
    // list.keys, list.list_complete, list.cursor

    return new Response(value);
  },
};
```

**Characteristics:**
- Eventually consistent (reads may be stale for up to 60 seconds)
- Max value size: 25 MB
- Max key size: 512 bytes
- Optimized for read-heavy workloads (caches at edge)
- Write latency: seconds (global propagation)

### 5.2 R2 (Object Storage)

S3-compatible object storage with zero egress fees.

```toml
# wrangler.toml
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"
```

```javascript
export default {
  async fetch(request, env) {
    // Put object
    await env.MY_BUCKET.put("file.txt", "content", {
      httpMetadata: { contentType: "text/plain" },
      customMetadata: { author: "agent" },
    });

    // Get object
    const obj = await env.MY_BUCKET.get("file.txt");
    if (obj) {
      return new Response(obj.body, {
        headers: { "Content-Type": obj.httpMetadata.contentType },
      });
    }

    // Head (metadata only)
    const head = await env.MY_BUCKET.head("file.txt");

    // Delete
    await env.MY_BUCKET.delete("file.txt");

    // List objects
    const listed = await env.MY_BUCKET.list({
      prefix: "uploads/",
      limit: 100,
      delimiter: "/",
    });

    // Multipart upload
    const mpu = await env.MY_BUCKET.createMultipartUpload("large-file.zip");
    const part1 = await mpu.uploadPart(1, chunk1);
    const part2 = await mpu.uploadPart(2, chunk2);
    await mpu.complete([part1, part2]);

    return new Response("OK");
  },
};
```

### 5.3 D1 (SQL Database)

Serverless SQLite database.

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxx-xxxx"
```

```javascript
export default {
  async fetch(request, env) {
    // Simple query
    const { results } = await env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(1).all();

    // Insert
    await env.DB.prepare(
      "INSERT INTO users (name, email) VALUES (?, ?)"
    ).bind("Alice", "alice@example.com").run();

    // Batch (transaction)
    const stmts = [
      env.DB.prepare("INSERT INTO users (name) VALUES (?)").bind("Bob"),
      env.DB.prepare("INSERT INTO users (name) VALUES (?)").bind("Carol"),
    ];
    await env.DB.batch(stmts);

    // First result only
    const user = await env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(1).first();

    // Raw SQL
    const raw = await env.DB.prepare("SELECT 1+1 as result").raw();

    return Response.json(results);
  },
};
```

### 5.4 Durable Objects

See `cloudflare-durable-objects.md` for detailed reference.

```toml
# wrangler.toml
[durable_objects]
bindings = [
  { name = "COUNTER", class_name = "Counter" }
]

[[migrations]]
tag = "v1"
new_classes = ["Counter"]
```

```javascript
export default {
  async fetch(request, env) {
    // Get a stub by name (deterministic ID)
    const id = env.COUNTER.idFromName("my-counter");
    const stub = env.COUNTER.get(id);

    // Forward request to the Durable Object
    return stub.fetch(request);
  },
};
```

### 5.5 Queues

See `cloudflare-queues.md` for detailed reference.

```toml
# wrangler.toml
[[queues.producers]]
queue = "my-queue"
binding = "MY_QUEUE"

[[queues.consumers]]
queue = "my-queue"
max_batch_size = 10
max_batch_timeout = 30
```

```javascript
export default {
  async fetch(request, env) {
    // Send a message
    await env.MY_QUEUE.send({ type: "email", to: "user@example.com" });

    // Send a batch
    await env.MY_QUEUE.sendBatch([
      { body: { task: "process-1" } },
      { body: { task: "process-2" } },
    ]);

    return new Response("Queued");
  },

  async queue(batch, env) {
    for (const msg of batch.messages) {
      console.log(msg.body);
      msg.ack();
    }
  },
};
```

### 5.6 Service Bindings (Worker-to-Worker)

```toml
# wrangler.toml
[[services]]
binding = "AUTH_SERVICE"
service = "auth-worker"
```

```javascript
export default {
  async fetch(request, env) {
    // Call another Worker directly (no network hop)
    const response = await env.AUTH_SERVICE.fetch(request);
    return response;
  },
};
```

### 5.7 Secrets and Environment Variables

```toml
# wrangler.toml
[vars]
API_URL = "https://api.example.com"
ENVIRONMENT = "production"
```

```bash
# Secrets (encrypted, not in wrangler.toml)
npx wrangler secret put API_KEY
```

```javascript
export default {
  async fetch(request, env) {
    const apiUrl = env.API_URL;      // from [vars]
    const apiKey = env.API_KEY;      // from secret
    return new Response(apiUrl);
  },
};
```

### 5.8 Hyperdrive (Database Connection Pooling)

```toml
# wrangler.toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "xxxx"
```

```javascript
import { Client } from "pg";

export default {
  async fetch(request, env) {
    const client = new Client(env.HYPERDRIVE.connectionString);
    await client.connect();
    const result = await client.query("SELECT * FROM users");
    await client.end();
    return Response.json(result.rows);
  },
};
```

### 5.9 Vectorize (Vector Database)

```toml
# wrangler.toml
[[vectorize]]
binding = "VECTORIZE"
index_name = "my-index"
```

```javascript
export default {
  async fetch(request, env) {
    // Insert vectors
    await env.VECTORIZE.upsert([
      { id: "doc-1", values: [0.1, 0.2, 0.3], metadata: { title: "Doc 1" } },
    ]);

    // Query
    const results = await env.VECTORIZE.query([0.1, 0.2, 0.3], {
      topK: 10,
      returnMetadata: true,
    });

    return Response.json(results);
  },
};
```

### 5.10 Workers AI

```toml
# wrangler.toml
[ai]
binding = "AI"
```

```javascript
export default {
  async fetch(request, env) {
    const result = await env.AI.run("@cf/meta/llama-2-7b-chat-int8", {
      prompt: "What is Cloudflare?",
    });
    return Response.json(result);
  },
};
```

---

## 6. Routing and Domains

### Custom Domains
```toml
# wrangler.toml
routes = [
  { pattern = "example.com/*", zone_name = "example.com" }
]

# Or use custom domains (preferred)
# Configured via dashboard or API
```

### Workers.dev Subdomain
Every Worker gets a default `*.workers.dev` URL:
```
https://my-worker.my-subdomain.workers.dev
```

### Route Patterns
```
example.com/*           # All paths
example.com/api/*       # Only /api paths
*.example.com/*         # All subdomains
example.com/api/v1/*    # Specific path prefix
```

---

## 7. Wrangler Configuration Reference

```toml
# wrangler.toml - Complete reference

name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# Account-level settings
account_id = "your-account-id"

# Build settings (optional)
[build]
command = "npm run build"
cwd = "."
watch_dir = "src"

# Environment variables
[vars]
ENVIRONMENT = "production"

# KV Namespaces
[[kv_namespaces]]
binding = "MY_KV"
id = "abc123"

# R2 Buckets
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"

# D1 Databases
[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "xxxx"

# Durable Objects
[durable_objects]
bindings = [
  { name = "MY_DO", class_name = "MyDurableObject" }
]

[[migrations]]
tag = "v1"
new_classes = ["MyDurableObject"]

# Queues
[[queues.producers]]
queue = "my-queue"
binding = "MY_QUEUE"

[[queues.consumers]]
queue = "my-queue"
max_batch_size = 10
max_batch_timeout = 30

# Service Bindings
[[services]]
binding = "AUTH"
service = "auth-worker"

# Cron Triggers
[triggers]
crons = ["*/5 * * * *", "0 0 * * *"]

# Tail consumers
[[tail_consumers]]
service = "log-worker"

# Placement (Smart Placement)
[placement]
mode = "smart"

# Limits
[limits]
cpu_ms = 30000

# Per-environment overrides
[env.staging]
name = "my-worker-staging"
vars = { ENVIRONMENT = "staging" }

[env.staging.routes]
pattern = "staging.example.com/*"
zone_name = "example.com"
```

---

## 8. Pricing (Standard Model - as of 2024)

### Free Plan
| Resource | Included |
|----------|----------|
| Requests | 100,000/day |
| CPU time | 10ms per invocation |
| Workers | Up to 100 |

### Paid Plan ($5/month base)
| Resource | Included | Overage |
|----------|----------|---------|
| Requests | 10 million/month | $0.30 per additional million |
| CPU time | 30 million ms/month | $0.02 per additional million ms |
| Duration (wall clock) | No limit | - |

### Bundled Model (legacy)
| Resource | Included | Overage |
|----------|----------|---------|
| Requests | 10 million/month | $0.50 per additional million |
| CPU time | 50ms per invocation | - |

---

## 9. Smart Placement

By default, Workers run at the data center closest to the user. **Smart Placement** automatically runs the Worker closer to backend services (databases, APIs) when that would be faster overall:

```toml
# wrangler.toml
[placement]
mode = "smart"
```

This is critical for Workers that make multiple backend calls - running near the backend reduces total round-trip time even though the initial edge-to-worker hop is longer.

---

## 10. Execution Context (ctx)

```javascript
export default {
  async fetch(request, env, ctx) {
    // waitUntil: keep the Worker alive after returning a response
    // Useful for background logging, analytics, cache writes
    ctx.waitUntil(doBackgroundWork());

    // passThroughOnException: if the Worker throws, pass the
    // request through to the origin server
    ctx.passThroughOnException();

    return new Response("OK");
  },
};
```

---

## 11. HTMLRewriter (Streaming HTML Transformation)

Unique to Workers - allows streaming HTML manipulation without buffering the entire document:

```javascript
export default {
  async fetch(request, env) {
    const response = await fetch("https://example.com");

    return new HTMLRewriter()
      .on("h1", {
        element(element) {
          element.setInnerContent("Modified Title");
        },
      })
      .on("a[href]", {
        element(element) {
          element.setAttribute("target", "_blank");
        },
      })
      .on("body", {
        element(element) {
          element.append('<script src="/inject.js"></script>', { html: true });
        },
      })
      .transform(response);
  },
};
```

---

## 12. Cache API

Workers can interact with Cloudflare's cache:

```javascript
export default {
  async fetch(request, env, ctx) {
    const cacheKey = new Request(request.url, request);
    const cache = caches.default;

    // Check cache
    let response = await cache.match(cacheKey);
    if (response) {
      return response;
    }

    // Fetch from origin
    response = await fetch(request);

    // Clone and cache
    response = new Response(response.body, response);
    response.headers.set("Cache-Control", "s-maxage=3600");
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  },
};
```

---

## 13. Middleware Patterns

### Request/Response Middleware
```javascript
// Middleware pattern
async function withAuth(request, env) {
  const token = request.headers.get("Authorization");
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Verify token...
  return null; // null means "continue"
}

async function withCORS(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return new Response(response.body, { ...response, headers });
}

export default {
  async fetch(request, env, ctx) {
    // Auth check
    const authResponse = await withAuth(request, env);
    if (authResponse) return authResponse;

    // Handle OPTIONS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Main logic
    const response = new Response("Hello");
    return withCORS(response);
  },
};
```

---

## 14. Key Architectural Considerations for JARVIS

1. **Scale-to-zero is inherent**: Workers only run when invoked. No idle costs.
2. **No long-running processes**: Workers are request-driven. For background work, use Cron Triggers, Queues, or Durable Object alarms.
3. **Stateless by default**: Use KV, R2, D1, or Durable Objects for persistence.
4. **128 MB memory limit**: Large datasets must be streamed or chunked.
5. **Subrequest limits**: Fan-out patterns must respect the 50 (free) / 1000 (paid) subrequest limit.
6. **Service bindings for microservices**: Worker-to-Worker calls via service bindings have zero network overhead and do not count against subrequest limits.
7. **Smart Placement for backend-heavy Workers**: When a Worker primarily calls a single backend, Smart Placement reduces latency by running the Worker near the backend.
8. **Compatibility dates**: Pin a compatibility date to avoid breaking changes; advance it intentionally during testing.
