---
archetypes: [jarvis]
skills: [workflow, operational-planning]
training_cluster: 02-workflow-orchestrator
domain: orchestration
difficulty: intermediate
version: 1.0
---
# Inngest Overview

> Source: https://www.inngest.com/docs
> Training material for JARVIS Workflow Orchestrator Agent

---

## What Is Inngest?

Inngest is a **durable workflow engine** that enables developers to build reliable, event-driven applications without managing infrastructure. It provides:

- **Durable execution**: Functions survive crashes, restarts, and deployments
- **Event-driven architecture**: Trigger workflows from events, cron schedules, or direct invocation
- **Automatic retries**: Built-in retry logic with configurable policies
- **Step functions**: Break complex workflows into individually retriable, resumable steps
- **Zero infrastructure**: No queues, workers, or state machines to manage -- Inngest handles orchestration

Inngest sits between your application and your business logic, acting as an orchestration layer that ensures every function runs to completion.

## How It Works

### Architecture

```
                                    +------------------+
  Your App / API                    |    Inngest       |
  +-------------+    sends event    |    Cloud/Server  |
  |  inngest.   | ----------------> |                  |
  |  send(event)|                   |  Event Store     |
  +-------------+                   |  Scheduler       |
                                    |  State Manager   |
  +-------------+    invokes step   |                  |
  |  inngest.   | <---------------- |                  |
  |  function() |                   +------------------+
  +-------------+
       |
       v
   Your business logic
   (each step is durable)
```

1. **Events are sent** to Inngest (from your API, webhook, cron, or other sources)
2. **Inngest matches events** to registered functions using trigger configurations
3. **Functions are invoked** via HTTP -- Inngest calls your serverless/server endpoint
4. **Steps execute durably** -- each `step.run()` is checkpointed; if a step fails, only that step retries
5. **State is managed** by Inngest -- you write plain functions, Inngest handles persistence

### Execution Model

Inngest uses a **"call and checkpoint"** execution model:

- When a function runs, Inngest calls your HTTP endpoint
- Each `step.run()` executes and its return value is **memoized** (saved to Inngest's state store)
- If the function needs to sleep or wait, Inngest **pauses execution** and resumes later
- On subsequent invocations, previously completed steps are **replayed from memoized state** (not re-executed)
- This means your function code runs multiple times, but each step only executes **once**

```typescript
const myFunction = inngest.createFunction(
  { id: "process-order" },
  { event: "order/placed" },

  async ({ event, step }) => {
    // Step 1: Only runs once, result is memoized
    const order = await step.run("validate-order", async () => {
      return await validateOrder(event.data.orderId);
    });

    // Step 2: Sleeps durably -- process is suspended, not blocked
    await step.sleep("wait-for-processing", "5m");

    // Step 3: Runs after sleep completes
    const confirmation = await step.run("send-confirmation", async () => {
      return await sendEmail(order.email, order.id);
    });

    return { orderId: order.id, confirmed: true };
  }
);
```

## Core Concepts

### 1. Events

Events are the primary trigger mechanism. They are JSON objects with a standard shape:

```typescript
// Event structure
interface InngestEvent {
  name: string;        // Event name (e.g., "user/signup")
  data: Record<string, any>;  // Event payload
  user?: Record<string, any>; // Optional user context
  ts?: number;         // Timestamp (auto-set if omitted)
  v?: string;          // Schema version
}

// Sending an event
await inngest.send({
  name: "user/signup",
  data: {
    userId: "usr_123",
    email: "user@example.com",
    plan: "pro",
  },
});
```

- Events are **immutable** once sent
- Multiple functions can trigger from the **same event** (fan-out)
- Events can be sent in **batches** for efficiency
- Events support **idempotency keys** to prevent duplicate processing

### 2. Functions

Functions are the units of work that respond to events:

```typescript
const fn = inngest.createFunction(
  {
    id: "unique-function-id",          // Unique identifier
    name: "Human Readable Name",       // Display name (optional)
    retries: 3,                        // Retry count on failure
    concurrency: [                     // Concurrency controls
      { limit: 10 },
      { limit: 1, key: "event.data.userId" },
    ],
    throttle: {                        // Rate limiting
      limit: 100,
      period: "1h",
    },
    cancelOn: [                        // Auto-cancel triggers
      { event: "order/cancelled", match: "data.orderId" },
    ],
    onFailure: failureHandler,         // Failure callback
  },
  { event: "order/placed" },           // Trigger configuration
  async ({ event, step }) => {
    // Function body with steps
  }
);
```

**Trigger types:**

| Trigger | Description | Example |
|---------|-------------|---------|
| `event` | Fires on matching event name | `{ event: "user/signup" }` |
| `cron` | Fires on a schedule | `{ cron: "0 9 * * MON" }` |
| `event` + `if` | Conditional event trigger | `{ event: "order/placed", if: "event.data.total > 100" }` |

### 3. Steps

Steps are the building blocks of durable workflows. Each step is:

- **Individually retriable** -- if step 3 fails, steps 1 and 2 are not re-executed
- **Memoized** -- return values are persisted and replayed on subsequent invocations
- **Composable** -- steps can be chained, parallelized, or conditionally executed

Key step primitives:

| Method | Purpose |
|--------|---------|
| `step.run()` | Execute a unit of work |
| `step.sleep()` | Pause for a duration |
| `step.sleepUntil()` | Pause until a specific time |
| `step.waitForEvent()` | Wait for a matching event |
| `step.sendEvent()` | Send events from within a step |
| `step.invoke()` | Invoke another Inngest function |

### 4. Inngest Client

The client is your interface to Inngest:

```typescript
import { Inngest } from "inngest";

const inngest = new Inngest({
  id: "my-app",              // App identifier
  eventKey: "your-event-key", // For sending events (optional if using serve)
});
```

### 5. Serve Handler

The serve handler exposes your functions as an HTTP endpoint:

```typescript
import { serve } from "inngest/next";  // or /express, /hono, etc.

export default serve({
  client: inngest,
  functions: [fn1, fn2, fn3],
});
```

Supported frameworks: Next.js, Express, Hono, Fastify, Remix, SvelteKit, Nuxt, Deno, Bun, Cloudflare Workers, AWS Lambda, and more.

### 6. Concurrency, Throttling, and Rate Limiting

Inngest provides fine-grained flow control:

```typescript
inngest.createFunction(
  {
    id: "process-payment",
    concurrency: [
      { limit: 50 },                              // Global max 50 concurrent
      { limit: 1, key: "event.data.userId" },      // 1 per user
    ],
    throttle: {
      limit: 100,
      period: "1m",
      key: "event.data.apiProvider",               // Per API provider
    },
    rateLimit: {
      limit: 1,
      period: "1s",
      key: "event.data.userId",                    // 1 per second per user
    },
  },
  { event: "payment/process" },
  async ({ event, step }) => { /* ... */ }
);
```

### 7. Idempotency

Inngest supports idempotency at multiple levels:

```typescript
// Event-level idempotency
await inngest.send({
  name: "order/placed",
  data: { orderId: "ord_123" },
  id: "order-ord_123",  // Idempotency key -- duplicate sends are ignored
});

// Function-level idempotency
inngest.createFunction(
  {
    id: "process-order",
    idempotency: "event.data.orderId",  // Only one run per orderId
  },
  { event: "order/placed" },
  handler
);
```

### 8. Batching

Process multiple events in a single function execution:

```typescript
inngest.createFunction(
  {
    id: "batch-process",
    batchEvents: {
      maxSize: 100,
      timeout: "5s",
    },
  },
  { event: "analytics/track" },
  async ({ events, step }) => {
    // `events` is an array of up to 100 events
    await step.run("bulk-insert", async () => {
      await db.insertMany(events.map(e => e.data));
    });
  }
);
```

## Key Benefits for Workflow Orchestration

1. **Durability**: Functions survive deployments, crashes, and infrastructure failures
2. **Observability**: Built-in dashboard with function run history, logs, and traces
3. **Developer experience**: Write normal TypeScript/JavaScript -- no state machines or DSLs
4. **Serverless-native**: Works with any serverless platform or traditional server
5. **Type safety**: Full TypeScript support with typed events and step returns
6. **Local development**: `npx inngest-cli@latest dev` provides a local dev server with UI
7. **Self-hosting option**: Inngest can be self-hosted for on-premise deployments

## Local Development

```bash
# Start the Inngest dev server
npx inngest-cli@latest dev

# The dev server provides:
# - Local event processing
# - Function discovery
# - Run history and debugging UI
# - Available at http://localhost:8288
```

## Deployment Model

Inngest does **not** run your code. Instead:

1. You deploy your app (with the serve handler) to any platform
2. Inngest discovers your functions by calling your serve endpoint
3. When events arrive, Inngest invokes your functions via HTTP
4. Your app processes steps and returns results to Inngest

This means Inngest works with **any hosting provider** -- Vercel, AWS, GCP, Railway, Fly.io, self-hosted, etc.
