---
archetypes: [jarvis]
skills: [infrastructure, system-integration]
training_cluster: 01-infrastructure-architect
domain: infrastructure
difficulty: advanced
version: 1.0
---
# Cloudflare Durable Objects - Training Reference

> Training material for JARVIS Infrastructure Architect agent.
> Source: https://developers.cloudflare.com/durable-objects/

---

## 1. Overview

Durable Objects (DOs) provide **stateful serverless compute** on Cloudflare's edge network. Each Durable Object is a single-threaded, strongly-consistent actor that combines compute and storage in a single addressable unit.

### Key Properties
- **Single-threaded**: Only one request is processed at a time (unless using async I/O, in which case multiple requests can be in-flight but JavaScript execution is single-threaded)
- **Strongly consistent**: All reads and writes to a DO's storage are serialized
- **Globally unique**: Each DO instance has a unique ID and runs in exactly one location
- **Persistent**: State survives between requests (unlike stateless Workers)
- **Addressable**: Any Worker anywhere in the world can communicate with a specific DO by its ID
- **Automatic scale-to-zero**: DOs are evicted from memory when idle (after ~10 seconds without the Hibernation API, or on explicit hibernation)

### Use Cases
- Real-time collaboration (documents, whiteboards)
- Chat rooms and messaging
- Game state and multiplayer lobbies
- Rate limiting and counters
- Leader election and coordination
- Shopping carts and session state
- IoT device state management
- Workflow orchestration

---

## 2. Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Worker A  │     │   Worker B  │     │   Worker C  │
│  (edge: NY) │     │ (edge: LON) │     │ (edge: TKY) │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────┬───────┴───────────────────┘
                   │
          ┌────────▼────────┐
          │  Durable Object │
          │  "room-42"      │
          │  (runs in: ATL) │  <-- Single location, single-threaded
          │                 │
          │  ┌────────────┐ │
          │  │ Transactional│ │
          │  │  Storage    │ │  <-- Co-located storage
          │  └────────────┘ │
          └─────────────────┘
```

- The DO runs in **one data center** (chosen based on the first request, or by location hint)
- Storage is **co-located** with the DO instance (no network hop for reads/writes)
- Workers anywhere can route requests to the DO via its stub

---

## 3. Defining a Durable Object Class

```javascript
// src/counter.js
export class Counter {
  constructor(state, env) {
    // state.storage: TransactionalStorage API
    // state.id: DurableObjectId
    // state.blockConcurrencyWhile(): block until async init completes
    // env: Worker bindings (KV, R2, etc.)

    this.state = state;
    this.env = env;

    // Use blockConcurrencyWhile for async initialization
    state.blockConcurrencyWhile(async () => {
      this.value = (await state.storage.get("value")) || 0;
    });
  }

  // Handle HTTP requests forwarded from Workers
  async fetch(request) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/increment":
        this.value++;
        await this.state.storage.put("value", this.value);
        return new Response(this.value.toString());

      case "/decrement":
        this.value--;
        await this.state.storage.put("value", this.value);
        return new Response(this.value.toString());

      case "/value":
        return new Response(this.value.toString());

      default:
        return new Response("Not found", { status: 404 });
    }
  }
}
```

---

## 4. Accessing Durable Objects from Workers

```javascript
// src/index.js (the Worker entrypoint)
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Method 1: ID from name (deterministic, same name = same DO)
    const id = env.COUNTER.idFromName("global-counter");

    // Method 2: Unique ID (random, globally unique)
    const uniqueId = env.COUNTER.newUniqueId();

    // Method 3: ID from string (reconstruct from stored ID string)
    const idFromStr = env.COUNTER.idFromString("abc123...");

    // Get a stub (proxy) for the Durable Object
    const stub = env.COUNTER.get(id);

    // Forward the request to the Durable Object
    const response = await stub.fetch(request);
    return response;

    // OR: use RPC-style calls (with named methods)
    // const value = await stub.increment();
  },
};

// Re-export the Durable Object class
export { Counter } from "./counter.js";
```

### RPC (Remote Procedure Call) Style

Instead of routing via `fetch()`, you can define named methods:

```javascript
import { DurableObject } from "cloudflare:workers";

export class Counter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
  }

  async increment() {
    let value = (await this.ctx.storage.get("value")) || 0;
    value++;
    await this.ctx.storage.put("value", value);
    return value;
  }

  async getCount() {
    return (await this.ctx.storage.get("value")) || 0;
  }
}
```

```javascript
// Calling from a Worker:
export default {
  async fetch(request, env) {
    const id = env.COUNTER.idFromName("my-counter");
    const stub = env.COUNTER.get(id);

    // Direct method call (no need to go through fetch)
    const count = await stub.increment();
    return new Response(`Count: ${count}`);
  },
};
```

---

## 5. Transactional Storage API

Each Durable Object has a co-located transactional key-value store.

```javascript
// Inside a Durable Object method:

// GET
const value = await this.state.storage.get("key");
const values = await this.state.storage.get(["key1", "key2"]); // Map

// PUT
await this.state.storage.put("key", value);
await this.state.storage.put({ key1: val1, key2: val2 }); // batch

// DELETE
await this.state.storage.delete("key");
await this.state.storage.delete(["key1", "key2"]);

// DELETE ALL
await this.state.storage.deleteAll();

// LIST (paginated)
const entries = await this.state.storage.list(); // Map of all entries
const prefixed = await this.state.storage.list({ prefix: "user:" });
const limited = await this.state.storage.list({
  prefix: "log:",
  limit: 100,
  start: "log:2024-01-01",
  end: "log:2024-12-31",
  reverse: true,
});

// TRANSACTION (atomic operations)
await this.state.storage.transaction(async (txn) => {
  const balance = await txn.get("balance");
  if (balance >= amount) {
    await txn.put("balance", balance - amount);
  } else {
    // Transaction will be rolled back if an error is thrown
    throw new Error("Insufficient funds");
  }
});

// SYNC (ensure all writes are flushed to disk)
await this.state.storage.sync();
```

### Storage Characteristics
- **Strongly consistent**: Reads always return the latest write
- **Durable**: Writes are persisted to disk before returning
- **Co-located**: Zero network latency between DO compute and storage
- **Transactional**: Supports atomic multi-key operations
- **Max value size**: 128 KB per value
- **Max keys**: Unlimited (but storage is billed)

---

## 6. SQL Storage API (SQLite-backed)

Durable Objects can now use SQLite as their storage backend:

```toml
# wrangler.toml
[[migrations]]
tag = "v1"
new_sqlite_classes = ["MyDO"]
```

```javascript
import { DurableObject } from "cloudflare:workers";

export class MyDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
  }

  async initialize() {
    // Create tables
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async addMessage(content, author) {
    this.ctx.storage.sql.exec(
      "INSERT INTO messages (content, author) VALUES (?, ?)",
      content,
      author
    );
  }

  async getMessages(limit = 50) {
    const cursor = this.ctx.storage.sql.exec(
      "SELECT * FROM messages ORDER BY created_at DESC LIMIT ?",
      limit
    );
    return cursor.toArray();
  }

  async search(query) {
    const cursor = this.ctx.storage.sql.exec(
      "SELECT * FROM messages WHERE content LIKE ?",
      `%${query}%`
    );
    return cursor.toArray();
  }
}
```

### SQL Storage Characteristics
- Full SQLite feature set (JOINs, indexes, triggers, FTS, JSON functions)
- Co-located with the DO (zero network latency)
- Automatic point-in-time recovery
- Max database size: 1 GB per Durable Object (on paid plans)
- Strongly consistent (same as KV storage)

---

## 7. Alarms

Alarms allow a Durable Object to schedule a future wake-up call. This is the primary mechanism for **scheduled background work** in Durable Objects.

```javascript
export class TaskScheduler {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/schedule") {
      // Schedule an alarm 60 seconds from now
      const alarmTime = Date.now() + 60_000;
      await this.state.storage.setAlarm(alarmTime);
      return new Response(`Alarm set for ${new Date(alarmTime).toISOString()}`);
    }

    if (url.pathname === "/cancel") {
      await this.state.storage.deleteAlarm();
      return new Response("Alarm cancelled");
    }

    if (url.pathname === "/check") {
      const alarm = await this.state.storage.getAlarm();
      return Response.json({ alarm });
    }

    return new Response("Not found", { status: 404 });
  }

  // Called when the alarm fires
  async alarm() {
    console.log("Alarm fired!");

    // Do work...
    await this.doScheduledWork();

    // Optionally reschedule (recurring alarm pattern)
    await this.state.storage.setAlarm(Date.now() + 60_000);
  }

  async doScheduledWork() {
    // Process queued tasks, send notifications, etc.
  }
}
```

### Alarm Characteristics
- Only **one alarm** can be set at a time per DO
- If an alarm is already set, `setAlarm()` overwrites it
- Alarms survive DO eviction from memory (they are persisted)
- Alarm precision: alarms fire at or after the scheduled time (not before)
- If `alarm()` throws an error, it will be retried (with backoff)
- Alarms will wake a hibernating DO

---

## 8. WebSockets and the Hibernation API

Durable Objects are ideal for WebSocket management because they are single-threaded and persistent.

### Basic WebSocket Handling

```javascript
export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = [];
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      server.accept();
      this.sessions.push(server);

      server.addEventListener("message", (event) => {
        // Broadcast to all connected clients
        for (const session of this.sessions) {
          if (session !== server && session.readyState === WebSocket.READY_STATE_OPEN) {
            session.send(event.data);
          }
        }
      });

      server.addEventListener("close", () => {
        this.sessions = this.sessions.filter((s) => s !== server);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Expected WebSocket", { status: 400 });
  }
}
```

### Hibernation API (Critical for Scale-to-Zero)

The **Hibernation API** allows a Durable Object to hibernate while maintaining WebSocket connections. This is essential for cost optimization - without it, a DO with open WebSocket connections stays in memory (and you pay for duration). With hibernation, the DO can be evicted from memory, and WebSocket messages will wake it up.

```javascript
import { DurableObject } from "cloudflare:workers";

export class ChatRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Use acceptWebSocket() instead of accept() for hibernation
      this.ctx.acceptWebSocket(server, ["chat"]); // tags are optional

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Expected WebSocket", { status: 400 });
  }

  // Called when a WebSocket message is received (wakes from hibernation)
  async webSocketMessage(ws, message) {
    // Get all connected WebSockets
    const sockets = this.ctx.getWebSockets();

    // Broadcast to all
    for (const socket of sockets) {
      if (socket !== ws) {
        socket.send(message);
      }
    }
  }

  // Called when a WebSocket is closed
  async webSocketClose(ws, code, reason, wasClean) {
    ws.close(code, reason);
  }

  // Called when a WebSocket error occurs
  async webSocketError(ws, error) {
    console.error("WebSocket error:", error);
    ws.close(1011, "Unexpected error");
  }
}
```

### Hibernation Key Points
- **`this.ctx.acceptWebSocket(ws, tags?)`**: Use instead of `ws.accept()`. Enables hibernation.
- **`this.ctx.getWebSockets(tag?)`**: Get all connected WebSockets (optionally filtered by tag).
- **Tags**: Strings attached to WebSockets for grouping (e.g., by room, by user role).
- **`this.ctx.setWebSocketAutoResponse(response)`**: Automatically respond to specific messages (e.g., pings) without waking the DO.
- While hibernating: no CPU charges, no memory charges. Only storage charges.
- WebSocket connections are maintained by the Cloudflare runtime even while the DO is hibernated.

### Auto-Response (Ping/Pong without waking)

```javascript
async fetch(request) {
  // Set up auto-response for ping messages
  this.ctx.setWebSocketAutoResponse(
    new WebSocketRequestResponsePair("ping", "pong")
  );

  // Now "ping" messages get "pong" responses WITHOUT waking the DO
  // ...
}
```

---

## 9. Location and Placement

### Location Hints

Control where a Durable Object is created:

```javascript
// Hint that this DO should be created near Western North America
const id = env.MY_DO.newUniqueId({ locationHint: "wnam" });
const stub = env.MY_DO.get(id);
```

Available location hints:
| Hint | Region |
|------|--------|
| `wnam` | Western North America |
| `enam` | Eastern North America |
| `sam` | South America |
| `weur` | Western Europe |
| `eeur` | Eastern Europe |
| `apac` | Asia Pacific |
| `oc` | Oceania |
| `afr` | Africa |
| `me` | Middle East |

### Jurisdiction Restrictions

For data sovereignty requirements:

```toml
# wrangler.toml
[durable_objects]
bindings = [
  { name = "EU_DO", class_name = "MyDO", script_name = "my-worker" }
]
```

```javascript
const id = env.EU_DO.idFromName("user-data");
// Force this DO to only run in the EU
const stub = env.EU_DO.get(id, { locationHint: "eeur" });
```

Or via jurisdiction at the binding level:
```javascript
const id = env.EU_DO.newUniqueId();
// Jurisdiction-restricted IDs ensure the DO and its storage stay in the EU
```

---

## 10. Configuration (wrangler.toml)

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Durable Object bindings
[durable_objects]
bindings = [
  { name = "COUNTER", class_name = "Counter" },
  { name = "CHAT_ROOM", class_name = "ChatRoom" },
  # Cross-script binding (DO defined in another Worker)
  { name = "EXTERNAL_DO", class_name = "ExternalDO", script_name = "other-worker" },
]

# Migrations (required when adding/removing/renaming DO classes)
[[migrations]]
tag = "v1"
new_classes = ["Counter", "ChatRoom"]

[[migrations]]
tag = "v2"
new_sqlite_classes = ["ChatRoom"]  # Migrate ChatRoom to SQLite storage
renamed_classes = [{ from = "OldName", to = "NewName" }]
deleted_classes = ["DeprecatedClass"]
```

---

## 11. Pricing

### Durable Object Pricing (Paid Workers Plan)

| Resource | Included | Overage |
|----------|----------|---------|
| Requests | 1 million/month | $0.15 per additional million |
| Duration (active) | 400,000 GB-s/month | $12.50 per additional million GB-s |
| Storage (KV) | 1 GB | $0.20 per additional GB |
| Storage (SQL) | 5 GB | $0.75 per additional GB-month |
| Reads (KV) | 1 million/month | $0.20 per additional million |
| Writes (KV) | 1 million/month | $1.00 per additional million |
| Read units (SQL) | 5 billion/month | $0.001 per additional million |
| Write units (SQL) | 25 million/month | $1.00 per additional million |

**Hibernation significantly reduces duration costs** - a DO with 1000 WebSocket connections that hibernates costs near-zero for duration while hibernating.

---

## 12. Patterns and Best Practices

### Pattern 1: Actor Model with Partitioned State

```javascript
// Each user gets their own Durable Object
export default {
  async fetch(request, env) {
    const userId = getUserIdFromAuth(request);
    const id = env.USER_STATE.idFromName(userId);
    const stub = env.USER_STATE.get(id);
    return stub.fetch(request);
  },
};
```

### Pattern 2: Coordination / Leader Election

```javascript
export class Coordinator extends DurableObject {
  async acquireLock(lockName, ttlMs = 30000) {
    const now = Date.now();
    const existing = await this.ctx.storage.get(`lock:${lockName}`);

    if (existing && existing.expires > now) {
      return { acquired: false, holder: existing.holder };
    }

    const lock = {
      holder: crypto.randomUUID(),
      expires: now + ttlMs,
    };
    await this.ctx.storage.put(`lock:${lockName}`, lock);
    return { acquired: true, holder: lock.holder };
  }

  async releaseLock(lockName, holder) {
    const existing = await this.ctx.storage.get(`lock:${lockName}`);
    if (existing && existing.holder === holder) {
      await this.ctx.storage.delete(`lock:${lockName}`);
      return true;
    }
    return false;
  }
}
```

### Pattern 3: Rate Limiter

```javascript
export class RateLimiter extends DurableObject {
  async checkRate(key, limit, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    const entries = await this.ctx.storage.list({ prefix: `rate:${key}:` });
    const batch = [];
    let count = 0;

    for (const [k, timestamp] of entries) {
      if (timestamp < windowStart) {
        batch.push(k);
      } else {
        count++;
      }
    }

    if (batch.length > 0) {
      await this.ctx.storage.delete(batch);
    }

    if (count >= limit) {
      return { allowed: false, remaining: 0, retryAfter: windowMs };
    }

    await this.ctx.storage.put(`rate:${key}:${now}`, now);
    return { allowed: true, remaining: limit - count - 1 };
  }
}
```

### Pattern 4: Alarm-based Workflow Engine

```javascript
export class Workflow extends DurableObject {
  async start(steps) {
    await this.ctx.storage.put("steps", steps);
    await this.ctx.storage.put("currentStep", 0);
    await this.ctx.storage.put("status", "running");
    await this.ctx.storage.setAlarm(Date.now()); // Execute immediately
  }

  async alarm() {
    const steps = await this.ctx.storage.get("steps");
    const currentStep = await this.ctx.storage.get("currentStep");

    if (currentStep >= steps.length) {
      await this.ctx.storage.put("status", "completed");
      return;
    }

    try {
      const step = steps[currentStep];
      await this.executeStep(step);
      await this.ctx.storage.put("currentStep", currentStep + 1);

      // Schedule next step
      const delay = step.delay || 0;
      await this.ctx.storage.setAlarm(Date.now() + delay);
    } catch (error) {
      await this.ctx.storage.put("status", "failed");
      await this.ctx.storage.put("error", error.message);
    }
  }

  async executeStep(step) {
    // Execute the step logic
    await fetch(step.url, {
      method: step.method || "POST",
      body: JSON.stringify(step.payload),
    });
  }
}
```

---

## 13. Key Architectural Considerations for JARVIS

1. **Single-threaded guarantee**: No need for locks or mutexes within a DO. All state access is serialized.
2. **Hibernation is critical for scale-to-zero**: Without hibernation, DOs with WebSocket connections stay in memory indefinitely. Always use the Hibernation API for WebSocket-based DOs.
3. **One alarm per DO**: For multiple scheduled tasks, use a single alarm that checks a task queue in storage.
4. **Location matters**: The first request to a new DO determines its location. Use location hints for latency-sensitive workloads.
5. **Storage limits**: 128 KB per KV value, 1 GB per SQLite database. Plan data partitioning accordingly.
6. **DO-to-DO communication**: DOs can call other DOs via their stubs. This enables hierarchical architectures (e.g., a "room manager" DO that coordinates per-user DOs).
7. **Input gates**: By default, a DO won't accept new requests while a storage operation is in-flight. This prevents interleaving bugs but can limit throughput.
8. **Billing model**: Duration-based billing means idle DOs in memory cost money. Hibernation and efficient alarm scheduling are essential for cost control.
