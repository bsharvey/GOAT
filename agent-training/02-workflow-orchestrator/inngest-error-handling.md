---
archetypes: [jarvis]
skills: [workflow, diagnostic-reasoning]
training_cluster: 02-workflow-orchestrator
domain: orchestration
difficulty: advanced
version: 1.0
---
# Inngest Error Handling and Retries

> Source: https://www.inngest.com/docs/features/inngest-functions/error-retries
> Training material for JARVIS Workflow Orchestrator Agent

---

## Overview

Inngest provides comprehensive error handling at multiple levels:

1. **Automatic step-level retries** -- individual steps are retried without re-running the entire function
2. **Configurable retry policies** -- control retry count, backoff, and timing
3. **Non-retriable errors** -- explicitly skip retries for known-fatal errors
4. **`onFailure` handlers** -- run compensation or cleanup logic after all retries are exhausted
5. **Function-level timeouts** -- prevent runaway executions

## Retry Behavior

### Default Behavior

- By default, Inngest retries **each step** up to **3 times** (4 total attempts including the initial try)
- Retries use **exponential backoff** with jitter
- Only the **failed step** is retried -- previously completed steps replay from memoized state
- If all retries are exhausted, the function is marked as **failed**

### Retry Flow

```
Step execution attempt 1 -> FAILS
  (exponential backoff ~5s)
Step execution attempt 2 -> FAILS
  (exponential backoff ~30s)
Step execution attempt 3 -> FAILS
  (exponential backoff ~2m)
Step execution attempt 4 -> FAILS
  -> All retries exhausted
  -> Function marked as FAILED
  -> onFailure handler invoked (if configured)
```

## Configuring Retries

### Function-Level Retry Count

```typescript
const fn = inngest.createFunction(
  {
    id: "important-task",
    retries: 10,           // Allow up to 10 retries (11 total attempts)
  },
  { event: "task/run" },
  handler
);

// Disable retries entirely
const noRetryFn = inngest.createFunction(
  {
    id: "no-retry-task",
    retries: 0,            // No retries -- one shot only
  },
  { event: "task/run-once" },
  handler
);
```

### Advanced Retry Configuration

```typescript
const fn = inngest.createFunction(
  {
    id: "with-backoff",
    retries: {
      attempts: 5,          // Number of retry attempts
      backoff: {
        type: "exponential", // "exponential" or "linear" -- NEW: custom backoff not yet available on all plans
      },
    },
  },
  { event: "task/run" },
  handler
);
```

### Retry Timing (Exponential Backoff)

The default exponential backoff schedule roughly follows:

| Attempt | Approximate Delay |
|---------|-------------------|
| 1st retry | ~5 seconds |
| 2nd retry | ~30 seconds |
| 3rd retry | ~2 minutes |
| 4th retry | ~10 minutes |
| 5th retry | ~30 minutes |
| 6th retry | ~1.5 hours |
| 7th retry | ~6 hours |

Delays include randomized jitter to prevent thundering herd problems.

## Non-Retriable Errors

Use `NonRetriableError` to immediately fail a function without retrying. This is for errors where retrying is known to be pointless (e.g., invalid input, missing permissions, business rule violations).

```typescript
import { NonRetriableError } from "inngest";

const fn = inngest.createFunction(
  { id: "process-payment" },
  { event: "payment/process" },
  async ({ event, step }) => {
    await step.run("validate-input", async () => {
      if (!event.data.amount || event.data.amount <= 0) {
        // This error will NOT be retried
        throw new NonRetriableError("Invalid payment amount", {
          cause: new Error(`Amount was: ${event.data.amount}`),
        });
      }
    });

    await step.run("check-account", async () => {
      const account = await getAccount(event.data.accountId);
      if (!account) {
        throw new NonRetriableError("Account not found -- cannot retry", {
          cause: new Error(`Account ID: ${event.data.accountId}`),
        });
      }
      if (account.status === "suspended") {
        throw new NonRetriableError("Account is suspended");
      }
      return account;
    });

    await step.run("charge", async () => {
      try {
        return await paymentProvider.charge(event.data);
      } catch (err) {
        if (err.code === "card_declined") {
          // Card declined is not retriable
          throw new NonRetriableError("Card declined", { cause: err });
        }
        // Other errors (network, timeout) ARE retriable -- re-throw normally
        throw err;
      }
    });
  }
);
```

### NonRetriableError Options

```typescript
throw new NonRetriableError(message: string, options?: {
  cause?: Error;    // Original error for stack trace preservation
});
```

## The `onFailure` Handler

The `onFailure` handler runs **after all retries are exhausted** and the function has permanently failed. It is itself a durable function with access to steps.

### Basic Usage

```typescript
const fn = inngest.createFunction(
  {
    id: "critical-process",
    retries: 5,
    onFailure: async ({ event, error, step }) => {
      // `event` is a special failure event wrapping the original
      // `event.data.event` contains the original triggering event
      // `event.data.error` contains the error details
      // `error` is the Error that caused the final failure

      await step.run("alert-team", async () => {
        await slack.send({
          channel: "#alerts",
          text: `Function "critical-process" failed after 5 retries.\n` +
                `Error: ${error.message}\n` +
                `Original event: ${JSON.stringify(event.data.event)}`,
        });
      });

      await step.run("log-failure", async () => {
        await db.failureLog.insert({
          functionId: "critical-process",
          error: error.message,
          stack: error.stack,
          originalEvent: event.data.event,
          failedAt: new Date().toISOString(),
        });
      });
    },
  },
  { event: "process/start" },
  handler
);
```

### Failure Event Shape

The `onFailure` handler receives a special event:

```typescript
interface FailureEvent {
  name: "inngest/function.failed";
  data: {
    function_id: string;        // The failed function's ID
    run_id: string;             // The run ID that failed
    error: {
      name: string;             // Error name
      message: string;          // Error message
      stack?: string;           // Stack trace
    };
    event: OriginalEvent;       // The original triggering event
  };
}
```

### Compensation Pattern with onFailure

```typescript
const provisionInfra = inngest.createFunction(
  {
    id: "provision-infrastructure",
    retries: 3,
    onFailure: async ({ event, error, step }) => {
      const originalEvent = event.data.event;

      // Compensating actions: tear down anything that was created
      await step.run("cleanup-dns", async () => {
        try {
          await dns.deleteRecord(originalEvent.data.domain);
        } catch (e) {
          // Ignore if it doesn't exist
        }
      });

      await step.run("cleanup-server", async () => {
        try {
          await cloud.terminateInstance(originalEvent.data.instanceId);
        } catch (e) {
          // Ignore if it doesn't exist
        }
      });

      await step.run("cleanup-database", async () => {
        try {
          await cloud.deleteDatabase(originalEvent.data.dbName);
        } catch (e) {
          // Ignore if it doesn't exist
        }
      });

      await step.run("notify-failure", async () => {
        await notifyAdmin({
          message: "Infrastructure provisioning failed and was cleaned up",
          error: error.message,
          domain: originalEvent.data.domain,
        });
      });
    },
  },
  { event: "infra/provision" },
  async ({ event, step }) => {
    const dns = await step.run("create-dns", async () => {
      return await dns.createRecord(event.data.domain);
    });

    const server = await step.run("create-server", async () => {
      return await cloud.createInstance(event.data.instanceConfig);
    });

    const database = await step.run("create-database", async () => {
      return await cloud.createDatabase(event.data.dbConfig);
    });

    await step.run("configure-app", async () => {
      await deployApp(server.ip, database.connectionString, dns.hostname);
    });

    return { dns, server, database };
  }
);
```

## Error Handling Patterns

### Try/Catch Within Steps

```typescript
await step.run("external-api-call", async () => {
  try {
    return await externalApi.call(data);
  } catch (error) {
    if (error.status === 404) {
      // Handle gracefully -- return a default
      return { found: false, data: null };
    }
    if (error.status === 422) {
      // Bad input -- don't retry
      throw new NonRetriableError("Invalid input for API", { cause: error });
    }
    // For 5xx, network errors, etc. -- rethrow to trigger retry
    throw error;
  }
});
```

### Graceful Degradation

```typescript
async ({ event, step }) => {
  let enrichedData;
  try {
    enrichedData = await step.run("enrich-data", async () => {
      return await enrichmentService.enrich(event.data);
    });
  } catch {
    // If enrichment fails after all retries, proceed without it
    enrichedData = event.data;
  }

  await step.run("process", async () => {
    await process(enrichedData);
  });
};
```

### Step-Level Error Boundaries

```typescript
async ({ event, step }) => {
  const results = await Promise.allSettled([
    step.run("task-a", () => serviceA.process(event.data)),
    step.run("task-b", () => serviceB.process(event.data)),
    step.run("task-c", () => serviceC.process(event.data)),
  ]);

  const successes = results.filter(r => r.status === "fulfilled");
  const failures = results.filter(r => r.status === "rejected");

  if (failures.length > 0) {
    await step.run("report-partial-failure", async () => {
      await reportPartialFailure(failures);
    });
  }

  return {
    completed: successes.length,
    failed: failures.length,
  };
};
```

## Function Timeouts

Set maximum execution times to prevent runaway functions:

```typescript
const fn = inngest.createFunction(
  {
    id: "time-limited",
    timeouts: {
      start: "1h",      // Must start within 1 hour of being enqueued
      finish: "24h",     // Must complete within 24 hours of starting
    },
  },
  { event: "task/run" },
  handler
);
```

| Timeout | Description |
|---------|-------------|
| `start` | Maximum time between event receipt and first step execution |
| `finish` | Maximum total wall-clock time for the entire function run |

## Retry Best Practices

1. **Use `NonRetriableError` for deterministic failures**: If you know retrying won't help (bad input, unauthorized, business rule violation), throw `NonRetriableError` to fail fast.

2. **Always configure `onFailure` for critical workflows**: Ensure you're notified when important functions permanently fail.

3. **Keep step side effects idempotent**: Since steps can be retried, ensure that re-running a step doesn't cause duplicate side effects (e.g., use idempotency keys for payment charges).

4. **Use try/catch for graceful degradation**: Not every failure needs to stop the workflow. Catch errors and provide fallback behavior when appropriate.

5. **Set appropriate retry counts**: More retries for transient issues (API rate limits, network errors). Fewer (or zero) for operations where failure is likely permanent.

6. **Use compensation in `onFailure`**: When a multi-step workflow fails, use the failure handler to clean up resources created by previously completed steps.

7. **Log context in errors**: Include relevant data (IDs, state) in error messages to aid debugging in the Inngest dashboard.

8. **Monitor the `attempt` parameter**: The handler receives `attempt` (0-indexed) to vary behavior based on retry count.

```typescript
async ({ event, step, attempt }) => {
  await step.run("call-api", async () => {
    const timeout = Math.min(5000 * (attempt + 1), 30000); // Increase timeout with each retry
    return await api.call(event.data, { timeout });
  });
};
```

## Error Types Summary

| Error Type | Behavior |
|------------|----------|
| Standard `Error` | Triggers retry (up to configured limit) |
| `NonRetriableError` | Immediately fails, skips remaining retries |
| Timeout | Function is cancelled and marked as timed out |
| Cancellation (`cancelOn`) | Function is cancelled (not an error) |

## Monitoring and Observability

Inngest provides built-in observability for error handling:

- **Run history**: See every step execution, retry, and failure in the dashboard
- **Error details**: Full error messages and stack traces for each failed attempt
- **Retry timeline**: Visual timeline showing when each retry occurred
- **Function metrics**: Success rate, failure rate, average duration, and retry frequency
- **Alerting**: Configure webhooks or integrations for function failures
