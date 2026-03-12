---
archetypes: [jarvis]
skills: [workflow, system-integration]
training_cluster: 02-workflow-orchestrator
domain: orchestration
difficulty: intermediate
version: 1.0
---
# Inngest TypeScript SDK Reference

> Source: https://www.inngest.com/docs/reference/typescript
> Training material for JARVIS Workflow Orchestrator Agent

---

## Installation

```bash
npm install inngest
# or
yarn add inngest
# or
pnpm add inngest
```

## Client Creation

### `new Inngest(options)`

Creates an Inngest client instance used to send events and define functions.

```typescript
import { Inngest } from "inngest";

const inngest = new Inngest({
  id: "my-application",         // Required: unique app identifier
  eventKey: "your-event-key",   // Optional: API key for sending events
  baseUrl: "http://localhost:8288", // Optional: custom Inngest server URL
  env: "production",            // Optional: environment name
  logger: customLogger,         // Optional: custom logger implementation
  middleware: [myMiddleware],    // Optional: middleware array
  schemas: new EventSchemas()   // Optional: typed event schemas
    .fromRecord<Events>(),
});
```

### Client Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for your application |
| `eventKey` | `string` | No | API key for sending events outside of functions |
| `baseUrl` | `string` | No | Custom Inngest server URL (defaults to cloud) |
| `env` | `string` | No | Environment name (e.g., "production", "staging") |
| `logger` | `Logger` | No | Custom logger (defaults to console) |
| `middleware` | `InngestMiddleware[]` | No | Array of middleware |
| `schemas` | `EventSchemas` | No | Typed event schemas |

## Event Schemas and Type Safety

### Defining Event Types

```typescript
// Define your event types
type Events = {
  "user/signup": {
    data: {
      userId: string;
      email: string;
      plan: "free" | "pro" | "enterprise";
    };
  };
  "order/placed": {
    data: {
      orderId: string;
      userId: string;
      items: Array<{ sku: string; quantity: number; price: number }>;
      total: number;
    };
  };
  "order/cancelled": {
    data: {
      orderId: string;
      reason?: string;
    };
  };
};

// Create a typed client
const inngest = new Inngest({
  id: "my-app",
  schemas: new EventSchemas().fromRecord<Events>(),
});

// Now events and functions are fully typed
await inngest.send({
  name: "user/signup",  // Autocompletes event names
  data: {               // Type-checked against Events["user/signup"]["data"]
    userId: "usr_123",
    email: "user@example.com",
    plan: "pro",
  },
});
```

### Using Zod Schemas

```typescript
import { z } from "zod";
import { Inngest, EventSchemas } from "inngest";

const userSignupSchema = z.object({
  data: z.object({
    userId: z.string(),
    email: z.string().email(),
    plan: z.enum(["free", "pro", "enterprise"]),
  }),
});

const inngest = new Inngest({
  id: "my-app",
  schemas: new EventSchemas().fromZod({
    "user/signup": { schema: userSignupSchema },
  }),
});
```

## Sending Events

### `inngest.send(event | event[])`

Send one or more events to Inngest.

```typescript
// Single event
await inngest.send({
  name: "user/signup",
  data: { userId: "usr_123", email: "a@b.com", plan: "free" },
});

// Multiple events (batch)
await inngest.send([
  { name: "user/signup", data: { userId: "usr_123", email: "a@b.com", plan: "free" } },
  { name: "user/signup", data: { userId: "usr_456", email: "b@c.com", plan: "pro" } },
]);

// With idempotency key
await inngest.send({
  id: "unique-idempotency-key",
  name: "order/placed",
  data: { orderId: "ord_789", userId: "usr_123", items: [], total: 99.99 },
});
```

## Creating Functions

### `inngest.createFunction(config, trigger, handler)`

```typescript
const fn = inngest.createFunction(
  config,    // Function configuration object
  trigger,   // Event trigger or cron trigger
  handler    // Async function with event and step context
);
```

### Function Configuration

```typescript
interface FunctionConfig {
  id: string;                    // Required: unique function ID
  name?: string;                 // Optional: human-readable name
  retries?: number;              // Default: 3. Number of retries on failure
  concurrency?: ConcurrencyConfig | ConcurrencyConfig[];
  throttle?: ThrottleConfig;
  rateLimit?: RateLimitConfig;
  debounce?: DebounceConfig;
  priority?: PriorityConfig;
  batchEvents?: BatchConfig;
  cancelOn?: CancelConfig[];
  onFailure?: FailureHandler;
  idempotency?: string;          // CEL expression for idempotency key
  timeouts?: {
    start?: string;              // Max time to wait for function to start
    finish?: string;             // Max total execution time
  };
}
```

### Trigger Configuration

```typescript
// Event trigger
{ event: "user/signup" }

// Event trigger with filter
{ event: "order/placed", if: "event.data.total > 100" }

// Cron trigger
{ cron: "0 9 * * MON-FRI" }  // Every weekday at 9 AM

// Cron trigger with timezone
{ cron: "TZ=America/New_York 0 9 * * MON-FRI" }
```

### Handler Function Signature

```typescript
async ({ event, step, logger, runId, attempt }: {
  event: EventPayload;        // The triggering event
  step: StepTools;             // Step function utilities
  logger: Logger;              // Logging interface
  runId: string;               // Unique run identifier
  attempt: number;             // Current attempt number (0-indexed)
}) => ReturnType
```

### Full Function Example

```typescript
const processOrder = inngest.createFunction(
  {
    id: "process-order",
    name: "Process Order",
    retries: 5,
    concurrency: [
      { limit: 50 },
      { limit: 1, key: "event.data.userId" },
    ],
    cancelOn: [
      { event: "order/cancelled", match: "data.orderId" },
    ],
    onFailure: async ({ event, error, step }) => {
      await step.run("notify-failure", async () => {
        await slack.send(`Order ${event.data.event.data.orderId} failed: ${error.message}`);
      });
    },
  },
  { event: "order/placed" },

  async ({ event, step, logger }) => {
    logger.info("Processing order", { orderId: event.data.orderId });

    const validated = await step.run("validate", async () => {
      return await validateOrder(event.data);
    });

    const payment = await step.run("charge-payment", async () => {
      return await chargePayment(validated);
    });

    await step.run("fulfill", async () => {
      return await fulfillOrder(validated, payment);
    });

    await step.run("notify-customer", async () => {
      await sendConfirmationEmail(event.data.userId, validated.orderId);
    });

    return { success: true, orderId: validated.orderId };
  }
);
```

## Step Functions Reference

### `step.run(id, handler)`

Execute a unit of work. The result is memoized and replayed on subsequent invocations.

```typescript
const result = await step.run("step-id", async () => {
  // Your business logic here
  const data = await fetchFromAPI();
  return data; // Return value is serialized and memoized
});
// `result` is available for subsequent steps
```

**Important**: Return values must be JSON-serializable (no functions, symbols, circular references, Date objects should be converted to strings/numbers).

### `step.sleep(id, duration)`

Pause execution for a specified duration. The function is suspended (not blocking).

```typescript
await step.sleep("wait-before-retry", "30s");
await step.sleep("cooling-period", "2h");
await step.sleep("daily-delay", "1d");
```

Duration format: `"Xs"` (seconds), `"Xm"` (minutes), `"Xh"` (hours), `"Xd"` (days).

### `step.sleepUntil(id, date)`

Pause until a specific date/time.

```typescript
await step.sleepUntil("wait-until-launch", "2025-01-01T00:00:00Z");
await step.sleepUntil("wait-until-date", new Date("2025-06-15"));
```

### `step.waitForEvent(id, options)`

Pause and wait for a matching event to arrive.

```typescript
const approvalEvent = await step.waitForEvent("wait-for-approval", {
  event: "order/approved",
  match: "data.orderId",  // Match on field equality with triggering event
  timeout: "24h",         // How long to wait before giving up
});

if (approvalEvent === null) {
  // Timeout -- no matching event arrived within 24 hours
  throw new Error("Approval timed out");
}
// approvalEvent contains the full event payload
```

### `step.sendEvent(id, event | event[])`

Send events from within a function (durable, memoized).

```typescript
await step.sendEvent("emit-processed", {
  name: "order/processed",
  data: { orderId: "ord_123", status: "complete" },
});

// Send multiple events
await step.sendEvent("emit-notifications", [
  { name: "notification/email", data: { to: "user@example.com" } },
  { name: "notification/sms", data: { to: "+1234567890" } },
]);
```

### `step.invoke(id, options)`

Invoke another Inngest function and wait for its result.

```typescript
const result = await step.invoke("call-sub-workflow", {
  function: otherFunction,     // Reference to another createFunction result
  data: { key: "value" },     // Data passed as event.data
  timeout: "5m",               // Optional timeout
});
```

## Middleware

Middleware allows you to hook into the function lifecycle.

```typescript
import { InngestMiddleware } from "inngest";

const loggingMiddleware = new InngestMiddleware({
  name: "Logging Middleware",

  init({ client, fn }) {
    return {
      onFunctionRun({ ctx, fn, steps }) {
        const startTime = Date.now();

        return {
          transformInput({ ctx, fn, steps }) {
            // Modify input before function runs
            return {
              ctx: {
                ...ctx,
                // Add custom context
                customLogger: createLogger(fn.id),
              },
            };
          },

          beforeExecution() {
            // Runs before each step execution
            console.log(`Starting step execution for ${fn.id}`);
          },

          afterExecution() {
            // Runs after each step execution
            console.log(`Step completed in ${Date.now() - startTime}ms`);
          },

          transformOutput({ result, step }) {
            // Transform the output of a step or the function
            return {
              result: {
                ...result,
                metadata: { duration: Date.now() - startTime },
              },
            };
          },

          beforeResponse() {
            // Last hook before response is sent back to Inngest
          },
        };
      },

      onSendEvent() {
        return {
          transformInput({ payloads }) {
            // Transform events before they are sent
            return {
              payloads: payloads.map(p => ({
                ...p,
                data: { ...p.data, sentAt: Date.now() },
              })),
            };
          },
        };
      },
    };
  },
});

// Use middleware
const inngest = new Inngest({
  id: "my-app",
  middleware: [loggingMiddleware],
});
```

### Built-in Middleware

```typescript
import { Inngest } from "inngest";

// Encryption middleware (for encrypting event data at rest)
import { encryptionMiddleware } from "@inngest/middleware-encryption";

// Sentry integration
import { sentryMiddleware } from "@inngest/middleware-sentry";

const inngest = new Inngest({
  id: "my-app",
  middleware: [
    encryptionMiddleware({ key: process.env.ENCRYPTION_KEY! }),
    sentryMiddleware(),
  ],
});
```

## Serve Handler

### `serve(options)`

Creates an HTTP handler for your framework.

```typescript
import { serve } from "inngest/next";      // Next.js App Router
import { serve } from "inngest/express";    // Express
import { serve } from "inngest/hono";       // Hono
import { serve } from "inngest/fastify";    // Fastify
import { serve } from "inngest/remix";      // Remix
import { serve } from "inngest/sveltekit";  // SvelteKit
import { serve } from "inngest/nuxt";       // Nuxt
import { serve } from "inngest/h3";         // H3
import { serve } from "inngest/koa";        // Koa
import { serve } from "inngest/lambda";     // AWS Lambda
import { serve } from "inngest/cloudflare"; // Cloudflare Workers
import { serve } from "inngest/bun";        // Bun

// Usage (Next.js App Router example)
// app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { fn1, fn2, fn3 } from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [fn1, fn2, fn3],
  // Optional configuration:
  signingKey: process.env.INNGEST_SIGNING_KEY,
  serveHost: "https://myapp.com",
  servePath: "/api/inngest",
  streaming: "allow",        // Enable streaming for long-running steps
  logLevel: "info",
});
```

### Serve Options

| Option | Type | Description |
|--------|------|-------------|
| `client` | `Inngest` | The Inngest client instance |
| `functions` | `InngestFunction[]` | Array of functions to serve |
| `signingKey` | `string` | Signing key for request verification |
| `serveHost` | `string` | Override the host URL for function registration |
| `servePath` | `string` | Override the path for the serve endpoint |
| `streaming` | `"allow" \| "force"` | Enable response streaming |
| `logLevel` | `string` | Log level ("debug", "info", "warn", "error") |

## Concurrency Configuration

```typescript
interface ConcurrencyConfig {
  limit: number;           // Maximum concurrent executions
  key?: string;            // CEL expression for partitioning (e.g., "event.data.userId")
  scope?: "fn" | "env" | "account";  // Scope of the concurrency limit
}

// Examples
concurrency: { limit: 10 }                                    // Max 10 concurrent globally
concurrency: { limit: 1, key: "event.data.userId" }           // 1 per user
concurrency: [
  { limit: 100 },                                             // 100 total
  { limit: 5, key: "event.data.tenantId" },                   // 5 per tenant
]
```

## Throttle Configuration

```typescript
interface ThrottleConfig {
  limit: number;         // Max executions per period
  period: string;        // Time period (e.g., "1m", "1h", "1d")
  key?: string;          // CEL expression for partitioning
  burst?: number;        // Allow burst above limit
}

// Example: Max 100 executions per hour per user
throttle: {
  limit: 100,
  period: "1h",
  key: "event.data.userId",
}
```

## Rate Limit Configuration

```typescript
interface RateLimitConfig {
  limit: number;         // Max events accepted per period
  period: string;        // Time period
  key?: string;          // CEL expression for partitioning
}

// Unlike throttle, rate limit DROPS excess events
rateLimit: {
  limit: 1,
  period: "1s",
  key: "event.data.userId",
}
```

## Debounce Configuration

```typescript
interface DebounceConfig {
  period: string;        // Debounce period
  key?: string;          // CEL expression for partitioning
  timeout?: string;      // Max time to wait before forcing execution
}

// Only run once after 5s of no new events for same userId
debounce: {
  period: "5s",
  key: "event.data.userId",
}
```

## Priority Configuration

```typescript
// CEL expression returning -600 to 600 (seconds of priority adjustment)
priority: {
  run: "event.data.plan == 'enterprise' ? -300 : event.data.plan == 'free' ? 300 : 0",
}
// Negative = higher priority (runs sooner), Positive = lower priority (runs later)
```

## Logger

```typescript
async ({ event, step, logger }) => {
  logger.info("Processing started", { eventId: event.data.id });
  logger.warn("Potential issue", { detail: "..." });
  logger.error("Something failed", { error: err });
  logger.debug("Debug info", { state: currentState });
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `INNGEST_EVENT_KEY` | API key for sending events |
| `INNGEST_SIGNING_KEY` | Signing key for request verification |
| `INNGEST_DEV` | Set to `1` to use the local dev server |
| `INNGEST_BASE_URL` | Custom Inngest server URL |
| `INNGEST_ENV` | Environment name override |
| `INNGEST_LOG_LEVEL` | Log level (debug, info, warn, error) |
| `INNGEST_STREAMING` | Enable streaming ("allow" or "force") |
