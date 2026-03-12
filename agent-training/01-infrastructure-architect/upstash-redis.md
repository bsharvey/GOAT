---
archetypes: [jarvis]
skills: [infrastructure, diagnostic-reasoning]
training_cluster: 01-infrastructure-architect
domain: infrastructure
difficulty: intermediate
version: 1.0
---
# Upstash Redis - Training Reference

> Training material for JARVIS Infrastructure Architect agent.
> Source: https://upstash.com/docs/redis/overall/getstarted

---

## 1. Overview

Upstash Redis is a **serverless, HTTP-based Redis** service designed for edge and serverless environments. Unlike traditional Redis which requires a persistent TCP connection, Upstash offers a **REST API** that works in any environment including Cloudflare Workers, Vercel Edge Functions, AWS Lambda, and browsers.

### Key Properties
- **Serverless**: Pay-per-request pricing, no server management
- **HTTP/REST API**: No persistent connections needed (critical for edge/serverless)
- **Redis-compatible**: Supports standard Redis commands
- **Global replication**: Multi-region read replicas for low-latency reads
- **Durable**: Data is persisted to disk (not purely in-memory like traditional Redis)
- **TLS encryption**: All connections encrypted by default
- **Scale-to-zero**: No charges when not in use
- **Edge-native**: Designed to work with Cloudflare Workers, Vercel Edge, Deno Deploy

---

## 2. Why Upstash for Serverless/Edge?

Traditional Redis requires persistent TCP connections. This is problematic in serverless because:

1. **Connection limits**: Serverless functions spin up/down rapidly, exhausting connection pools
2. **Cold start overhead**: Establishing TCP + TLS connections adds latency
3. **Edge incompatibility**: Cloudflare Workers cannot open raw TCP sockets (only HTTP)
4. **Connection pooling impossible**: Each function invocation is isolated

Upstash solves this with an **HTTP-based protocol**:

```
Traditional Redis:
  Client ──TCP/TLS──> Redis Server (persistent connection)

Upstash Redis:
  Client ──HTTP/REST──> Upstash API ──> Redis Engine
  (stateless, per-request, works everywhere HTTP works)
```

---

## 3. Connection Methods

### Method 1: @upstash/redis SDK (Recommended)

The official SDK wraps the REST API with a Redis-like interface:

```bash
npm install @upstash/redis
```

```javascript
import { Redis } from "@upstash/redis";

// From environment variables (recommended)
const redis = Redis.fromEnv();
// Expects UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN

// Or explicit configuration
const redis = new Redis({
  url: "https://us1-merry-cat-12345.upstash.io",
  token: "AXXXXXXXXXXXXXXXXXXXXXXXXxx=",
});
```

### Method 2: REST API (Direct HTTP)

```bash
# Set a key
curl -X POST "https://us1-merry-cat-12345.upstash.io/set/mykey/myvalue" \
  -H "Authorization: Bearer AXXXXXXXXXXXXXXXXXXXXXXXXxx="

# Get a key
curl "https://us1-merry-cat-12345.upstash.io/get/mykey" \
  -H "Authorization: Bearer AXXXXXXXXXXXXXXXXXXXXXXXXxx="

# Response format:
# { "result": "myvalue" }

# Pipeline multiple commands in one request
curl -X POST "https://us1-merry-cat-12345.upstash.io/pipeline" \
  -H "Authorization: Bearer AXXXXXXXXXXXXXXXXXXXXXXXXxx=" \
  -d '[
    ["SET", "key1", "value1"],
    ["SET", "key2", "value2"],
    ["GET", "key1"]
  ]'
```

### Method 3: Standard Redis Client (TCP)

For environments that support TCP connections:

```javascript
import { createClient } from "redis";

const client = createClient({
  url: "rediss://default:AXXXXXXXXXXXXXXXXXXXXXXXXxx=@us1-merry-cat-12345.upstash.io:6379",
});

await client.connect();
await client.set("key", "value");
const value = await client.get("key");
```

> **Note**: TCP connections are NOT available in Cloudflare Workers. Use the REST API / SDK for Workers.

---

## 4. Core Operations with @upstash/redis

### Strings

```javascript
import { Redis } from "@upstash/redis";
const redis = Redis.fromEnv();

// SET / GET
await redis.set("user:1:name", "Alice");
const name = await redis.get("user:1:name"); // "Alice"

// SET with expiration
await redis.set("session:abc", "data", { ex: 3600 }); // expires in 1 hour
await redis.set("session:abc", "data", { px: 60000 }); // expires in 60 seconds (ms)
await redis.set("cache:key", "data", { nx: true }); // only set if not exists
await redis.set("cache:key", "data", { xx: true }); // only set if exists

// SETEX (set with expiration)
await redis.setex("temp:key", 300, "value"); // 300 second TTL

// GET and SET atomically
const oldValue = await redis.getset("counter", "0");

// MSET / MGET (multiple keys)
await redis.mset({
  "user:1:name": "Alice",
  "user:1:email": "alice@example.com",
  "user:1:role": "admin",
});
const [name, email, role] = await redis.mget(
  "user:1:name",
  "user:1:email",
  "user:1:role"
);

// INCR / DECR
await redis.set("counter", 0);
await redis.incr("counter");       // 1
await redis.incrby("counter", 5);  // 6
await redis.decr("counter");       // 5
await redis.decrby("counter", 3);  // 2
await redis.incrbyfloat("score", 1.5); // float increment

// String operations
const len = await redis.strlen("user:1:name"); // 5
await redis.append("user:1:name", " Smith");   // "Alice Smith"

// TTL management
await redis.expire("key", 3600);       // set TTL
await redis.expireat("key", unixTime); // set expiry timestamp
await redis.persist("key");            // remove TTL
const ttl = await redis.ttl("key");    // get remaining TTL (seconds)
const pttl = await redis.pttl("key");  // get remaining TTL (milliseconds)

// Key operations
const exists = await redis.exists("key");     // 0 or 1
await redis.del("key1", "key2");              // delete keys
await redis.rename("old-key", "new-key");     // rename
const type = await redis.type("key");         // "string", "list", etc.
const keys = await redis.keys("user:*");      // find keys by pattern (use sparingly!)
```

### Hashes

```javascript
// HSET / HGET
await redis.hset("user:1", {
  name: "Alice",
  email: "alice@example.com",
  age: "30",
  role: "admin",
});

const name = await redis.hget("user:1", "name"); // "Alice"

// HGETALL (get all fields)
const user = await redis.hgetall("user:1");
// { name: "Alice", email: "alice@example.com", age: "30", role: "admin" }

// HMGET (multiple fields)
const [name, email] = await redis.hmget("user:1", "name", "email");

// HDEL (delete field)
await redis.hdel("user:1", "age");

// HEXISTS
const exists = await redis.hexists("user:1", "name"); // 1

// HINCRBY
await redis.hincrby("user:1", "loginCount", 1);

// HKEYS / HVALS / HLEN
const fields = await redis.hkeys("user:1");
const values = await redis.hvals("user:1");
const count = await redis.hlen("user:1");

// HSCAN (iterate over fields)
const [cursor, entries] = await redis.hscan("user:1", 0, { match: "name*" });
```

### Lists

```javascript
// LPUSH / RPUSH (add to list)
await redis.lpush("queue", "first");  // add to head
await redis.rpush("queue", "last");   // add to tail
await redis.rpush("queue", "a", "b", "c"); // add multiple

// LPOP / RPOP (remove from list)
const head = await redis.lpop("queue"); // remove from head
const tail = await redis.rpop("queue"); // remove from tail

// LRANGE (get range)
const all = await redis.lrange("queue", 0, -1); // all elements
const first3 = await redis.lrange("queue", 0, 2); // first 3

// LLEN (length)
const len = await redis.llen("queue");

// LINDEX (get by index)
const item = await redis.lindex("queue", 0); // first element

// LSET (set by index)
await redis.lset("queue", 0, "new-value");

// LTRIM (trim to range)
await redis.ltrim("queue", 0, 99); // keep only first 100

// BRPOP / BLPOP (blocking pop - not available via REST)
// Use regular RPOP/LPOP in serverless environments
```

### Sets

```javascript
// SADD
await redis.sadd("tags:post:1", "javascript", "cloudflare", "serverless");

// SMEMBERS (get all members)
const tags = await redis.smembers("tags:post:1");

// SISMEMBER (check membership)
const isMember = await redis.sismember("tags:post:1", "javascript"); // 1

// SCARD (count)
const count = await redis.scard("tags:post:1");

// SREM (remove)
await redis.srem("tags:post:1", "serverless");

// Set operations
const union = await redis.sunion("set1", "set2");
const inter = await redis.sinter("set1", "set2");
const diff = await redis.sdiff("set1", "set2");

// Random member
const random = await redis.srandmember("tags:post:1");
```

### Sorted Sets

```javascript
// ZADD
await redis.zadd("leaderboard", {
  score: 100,
  member: "player:1",
});
await redis.zadd("leaderboard",
  { score: 200, member: "player:2" },
  { score: 150, member: "player:3" },
);

// ZRANGE (get by rank, ascending)
const top10 = await redis.zrange("leaderboard", 0, 9, { rev: true });
// With scores
const top10WithScores = await redis.zrange("leaderboard", 0, 9, {
  rev: true,
  withScores: true,
});

// ZSCORE (get score)
const score = await redis.zscore("leaderboard", "player:1"); // 100

// ZRANK (get rank)
const rank = await redis.zrank("leaderboard", "player:1");

// ZINCRBY (increment score)
await redis.zincrby("leaderboard", 50, "player:1"); // now 150

// ZRANGEBYSCORE (get by score range)
const mid = await redis.zrangebyscore("leaderboard", 100, 200);

// ZCARD (count)
const total = await redis.zcard("leaderboard");

// ZREM
await redis.zrem("leaderboard", "player:1");

// ZCOUNT (count in score range)
const count = await redis.zcount("leaderboard", 100, 200);
```

### JSON Operations

Upstash supports Redis JSON module:

```javascript
// Set JSON
await redis.json.set("user:1", "$", {
  name: "Alice",
  age: 30,
  address: { city: "NYC", zip: "10001" },
  tags: ["admin", "user"],
});

// Get JSON (full or path)
const user = await redis.json.get("user:1", "$");
const city = await redis.json.get("user:1", "$.address.city");

// Update nested field
await redis.json.set("user:1", "$.age", 31);

// Append to array
await redis.json.arrappend("user:1", "$.tags", "moderator");

// Get array length
const len = await redis.json.arrlen("user:1", "$.tags");
```

---

## 5. Pipelines and Transactions

### Pipeline (Batch Multiple Commands)

```javascript
const redis = Redis.fromEnv();

// Pipeline: send multiple commands in a single HTTP request
const pipeline = redis.pipeline();
pipeline.set("key1", "value1");
pipeline.set("key2", "value2");
pipeline.get("key1");
pipeline.incr("counter");

// Execute all at once (single HTTP round-trip)
const results = await pipeline.exec();
// results: ["OK", "OK", "value1", 1]
```

### Multi/Exec (Transactions)

```javascript
const redis = Redis.fromEnv();

// Transaction: atomic execution
const tx = redis.multi();
tx.set("key1", "value1");
tx.set("key2", "value2");
tx.get("key1");

// Execute atomically
const results = await tx.exec();
// results: ["OK", "OK", "value1"]
```

> **Important**: Pipelines are executed in a single request but are NOT atomic. Use `multi()`/`exec()` for atomicity.

---

## 6. Pub/Sub

Upstash supports Redis Pub/Sub but with important caveats for serverless:

### Publishing (Works via REST)

```javascript
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Publish a message to a channel
await redis.publish("events", JSON.stringify({
  type: "user.created",
  userId: "user-123",
  timestamp: Date.now(),
}));
```

### Subscribing (Requires TCP Connection)

Traditional Pub/Sub subscribe requires a persistent TCP connection, which is **not available in Cloudflare Workers**:

```javascript
// This works in Node.js / long-running environments, NOT in Workers
import { createClient } from "redis";

const subscriber = createClient({
  url: "rediss://default:token@host:6379",
});

await subscriber.connect();
await subscriber.subscribe("events", (message) => {
  console.log("Received:", message);
});
```

### Serverless Pub/Sub Alternative

For serverless environments, use these patterns instead:

1. **Polling with `BRPOP` workaround**: Not viable in Workers (no blocking)
2. **Cloudflare Queues**: Better fit for async messaging in Workers
3. **Upstash QStash**: Upstash's HTTP-based message queue designed for serverless

```javascript
// Pattern: Use Redis as a message bus with polling (for non-Workers environments)
// Producer
await redis.rpush("channel:events", JSON.stringify({ type: "event" }));

// Consumer (polling)
const message = await redis.lpop("channel:events");
```

---

## 7. Caching Patterns

### Pattern 1: Cache-Aside

```javascript
async function getCachedData(redis, key, fetchFn, ttlSeconds = 300) {
  // Try cache
  const cached = await redis.get(key);
  if (cached !== null) {
    return cached; // Cache hit
  }

  // Cache miss: fetch from source
  const data = await fetchFn();

  // Store in cache with TTL
  await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });

  return data;
}

// Usage in a Worker
export default {
  async fetch(request, env) {
    const redis = Redis.fromEnv();
    const userId = new URL(request.url).searchParams.get("id");

    const user = await getCachedData(
      redis,
      `cache:user:${userId}`,
      () => fetchUserFromDB(userId),
      600 // 10 minute TTL
    );

    return Response.json(user);
  },
};
```

### Pattern 2: Rate Limiting with Sliding Window

```javascript
async function isRateLimited(redis, key, limit, windowSeconds) {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const pipe = redis.pipeline();
  // Remove expired entries
  pipe.zremrangebyscore(key, 0, windowStart);
  // Add current request
  pipe.zadd(key, { score: now, member: `${now}-${Math.random()}` });
  // Count requests in window
  pipe.zcard(key);
  // Set TTL on the key
  pipe.expire(key, windowSeconds);

  const results = await pipe.exec();
  const requestCount = results[2]; // zcard result

  return requestCount > limit;
}

// Usage
export default {
  async fetch(request, env) {
    const redis = Redis.fromEnv();
    const ip = request.headers.get("cf-connecting-ip");

    const limited = await isRateLimited(redis, `rate:${ip}`, 100, 60);
    if (limited) {
      return new Response("Rate limited", { status: 429 });
    }

    return new Response("OK");
  },
};
```

### Pattern 3: Session Storage

```javascript
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

async function createSession(userId, data) {
  const sessionId = crypto.randomUUID();
  await redis.hset(`session:${sessionId}`, {
    userId,
    ...data,
    createdAt: Date.now().toString(),
  });
  await redis.expire(`session:${sessionId}`, 86400); // 24 hour TTL
  return sessionId;
}

async function getSession(sessionId) {
  const session = await redis.hgetall(`session:${sessionId}`);
  if (!session || Object.keys(session).length === 0) return null;
  return session;
}

async function destroySession(sessionId) {
  await redis.del(`session:${sessionId}`);
}
```

---

## 8. Cloudflare Workers Integration

### Full Example: Worker with Upstash Redis

```toml
# wrangler.toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
UPSTASH_REDIS_REST_URL = "https://us1-merry-cat-12345.upstash.io"

# Store the token as a secret:
# npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

```typescript
// src/index.ts
import { Redis } from "@upstash/redis/cloudflare";

export interface Env {
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

    const url = new URL(request.url);

    // Simple API with Redis backing
    switch (url.pathname) {
      case "/set": {
        const { key, value } = await request.json();
        await redis.set(key, value);
        return new Response("OK");
      }

      case "/get": {
        const key = url.searchParams.get("key");
        const value = await redis.get(key);
        return Response.json({ value });
      }

      case "/incr": {
        const key = url.searchParams.get("key");
        const value = await redis.incr(key);
        return Response.json({ value });
      }

      default:
        return new Response("Not found", { status: 404 });
    }
  },
};
```

### Using @upstash/redis with Cloudflare Workers (Edge Import)

```javascript
// For Cloudflare Workers, import from the cloudflare subpath
import { Redis } from "@upstash/redis/cloudflare";

// This uses fetch() internally (compatible with Workers runtime)
// The default import uses Node.js built-ins which won't work in Workers
```

---

## 9. Global Replication

Upstash supports multi-region databases for low-latency global reads:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Primary   │     │  Replica    │     │  Replica    │
│ (us-east-1) │────>│ (eu-west-1) │     │ (ap-south-1)│
│   R/W       │     │   Read-only │     │   Read-only │
└─────────────┘     └─────────────┘     └─────────────┘
```

- **Writes** go to the primary region
- **Reads** are served from the nearest replica
- Replication lag: typically < 10ms between regions
- Consistency: eventual consistency for reads, strong consistency for writes to primary

### Auto-Routing

```javascript
const redis = new Redis({
  url: "https://global-merry-cat-12345.upstash.io", // global endpoint
  token: "...",
  automaticDeserialization: true,
});

// Reads are automatically routed to the nearest replica
// Writes are automatically routed to the primary
```

---

## 10. Eviction Policies

Upstash supports standard Redis eviction policies:

| Policy | Description |
|--------|-------------|
| `noeviction` | Returns error when memory limit is reached (default) |
| `allkeys-lru` | Evict least recently used keys |
| `allkeys-lfu` | Evict least frequently used keys |
| `allkeys-random` | Evict random keys |
| `volatile-lru` | Evict LRU keys with TTL set |
| `volatile-lfu` | Evict LFU keys with TTL set |
| `volatile-random` | Evict random keys with TTL set |
| `volatile-ttl` | Evict keys with shortest TTL |

---

## 11. Pricing

### Pay-As-You-Go
| Resource | Free Tier | Price |
|----------|-----------|-------|
| Commands | 10,000/day | $0.2 per 100K commands |
| Storage | 256 MB | Included (up to plan limit) |
| Bandwidth | Included | Included |
| Max data size | 256 MB | Up to 10 GB |
| Daily command limit | 10,000 | Unlimited (paid) |
| Connections | Unlimited (REST) | Unlimited |

### Fixed Plans
| Plan | Price | Max Data | Daily Commands |
|------|-------|----------|----------------|
| Free | $0 | 256 MB | 10,000 |
| Pay-As-You-Go | From $0 | 1-10 GB | Unlimited |
| Pro | $280/mo | 50 GB | Unlimited |
| Enterprise | Custom | Custom | Unlimited |

### Global Replication
- Each additional read replica adds to the per-command cost
- Example: 2 replicas = 2x read cost (reads served locally)

---

## 12. Upstash QStash (Related: HTTP-Based Message Queue)

QStash is Upstash's HTTP-based message queue, often used alongside Redis in serverless architectures:

```javascript
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: "..." });

// Publish a message (delivered via HTTP to your endpoint)
await qstash.publishJSON({
  url: "https://my-worker.example.com/process",
  body: { task: "generate-report", userId: "123" },
  delay: 60,          // delay in seconds
  retries: 3,         // number of retries
  deduplicationId: "unique-id", // prevent duplicate processing
});
```

> QStash delivers messages via HTTP webhooks, making it ideal for Workers (unlike traditional message queues that require persistent connections).

---

## 13. Key Architectural Considerations for JARVIS

1. **REST API is the primary interface for edge**: Always use `@upstash/redis/cloudflare` in Workers. The REST API eliminates connection management entirely.
2. **Pipeline everything**: Each `redis.*` call is an HTTP request. Use `redis.pipeline()` to batch multiple commands into a single HTTP round-trip. This is critical for performance.
3. **No blocking commands**: `BRPOP`, `BLPOP`, `SUBSCRIBE` do not work in serverless. Use Cloudflare Queues or QStash for async messaging.
4. **TTL on everything**: In a serverless context, set TTLs aggressively. There is no background cleanup process - Redis handles expiration automatically.
5. **Global replication for read-heavy workloads**: If your Workers run globally and read from Redis frequently, enable global replication to minimize cross-region latency.
6. **Complementary to Durable Objects**: Use Redis for shared state across multiple DOs or Workers. Use DOs for per-entity state with single-writer semantics. Use Redis for cross-entity queries and caching.
7. **Cost awareness**: Each command costs money. Batch operations (MGET, MSET, pipelines) reduce costs. Avoid `KEYS *` in production (use SCAN or structured key prefixes).
8. **Serialization**: The SDK automatically serializes/deserializes JSON. Be explicit about data types to avoid surprises.
9. **Not a primary database**: Use Redis for caching, sessions, rate limiting, leaderboards, and ephemeral state. Use D1, R2, or external databases for primary persistence.
