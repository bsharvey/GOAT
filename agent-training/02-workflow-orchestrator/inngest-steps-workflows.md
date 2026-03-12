---
archetypes: [jarvis]
skills: [workflow, operational-planning]
training_cluster: 02-workflow-orchestrator
domain: orchestration
difficulty: intermediate
version: 1.0
---
# Inngest Steps and Workflow Patterns

> Source: https://www.inngest.com/docs/features/inngest-functions/steps-workflows
> Training material for JARVIS Workflow Orchestrator Agent

---

## Overview

Steps are the fundamental building blocks of Inngest workflows. Each step is:

- **Individually retriable**: If step 3 fails, steps 1 and 2 are not re-executed
- **Memoized**: Return values are persisted; on replay, the cached result is returned instead of re-running
- **Durable**: Steps survive process restarts, deployments, and crashes
- **Composable**: Steps can be sequenced, parallelized, nested, and conditionally executed

## How Step Memoization Works

```
First invocation:
  step.run("a") -> EXECUTES -> returns result, Inngest saves it
  step.run("b") -> EXECUTES -> returns result, Inngest saves it
  step.sleep("wait", "1h") -> SUSPENDS function

After 1 hour, second invocation:
  step.run("a") -> REPLAYS from saved state (not re-executed)
  step.run("b") -> REPLAYS from saved state (not re-executed)
  step.sleep("wait", "1h") -> REPLAYS (already completed)
  step.run("c") -> EXECUTES -> returns result, Inngest saves it
```

**Critical rule**: Step IDs must be **unique** within a function. Each step ID is the key used for memoization. Duplicate IDs will cause unexpected behavior.

---

## Step Primitives

### `step.run(id, handler)` -- Execute Work

The most common step type. Executes an async function and memoizes its result.

```typescript
const result = await step.run("fetch-user-data", async () => {
  const user = await db.users.findById(userId);
  if (!user) throw new Error("User not found"); // Will trigger retry
  return user; // Must be JSON-serializable
});

// `result` is the user object, available to subsequent steps
```

**Rules:**
- Return value **must** be JSON-serializable (no Date objects, functions, undefined, etc.)
- Side effects (API calls, DB writes) only happen **once** due to memoization
- If the handler throws, the **step** is retried (not the entire function)
- The step ID string must be unique within the function

### `step.sleep(id, duration)` -- Durable Sleep

Suspends function execution for a duration. The process is freed -- no resources are consumed during sleep.

```typescript
// Duration formats
await step.sleep("short-wait", "30s");    // 30 seconds
await step.sleep("medium-wait", "15m");   // 15 minutes
await step.sleep("long-wait", "2h");      // 2 hours
await step.sleep("very-long", "7d");      // 7 days

// Use case: Drip campaign
const welcome = inngest.createFunction(
  { id: "welcome-drip" },
  { event: "user/signup" },
  async ({ event, step }) => {
    await step.run("send-welcome", async () => {
      await sendEmail(event.data.email, "welcome");
    });

    await step.sleep("wait-1-day", "1d");

    await step.run("send-tips", async () => {
      await sendEmail(event.data.email, "tips-and-tricks");
    });

    await step.sleep("wait-3-days", "3d");

    await step.run("send-upgrade-offer", async () => {
      await sendEmail(event.data.email, "upgrade-to-pro");
    });
  }
);
```

### `step.sleepUntil(id, date)` -- Sleep Until Specific Time

```typescript
// ISO 8601 string
await step.sleepUntil("wait-for-launch", "2025-07-01T09:00:00Z");

// Date object
const nextMonday = getNextMonday();
await step.sleepUntil("wait-for-monday", nextMonday);

// Dynamic date from event
await step.sleepUntil("wait-for-scheduled-time", event.data.scheduledAt);
```

### `step.waitForEvent(id, options)` -- Human-in-the-Loop and Event Coordination

Pauses the function until a matching event is received, or the timeout expires.

```typescript
interface WaitForEventOptions {
  event: string;          // Event name to wait for
  timeout: string;        // Max wait duration (e.g., "24h")
  match?: string;         // Field to match between triggering event and waited event
  if?: string;            // CEL expression for additional filtering
}
```

#### Basic Usage

```typescript
const approval = await step.waitForEvent("wait-for-approval", {
  event: "expense/approved",
  match: "data.expenseId",   // Matches event.data.expenseId from trigger
  timeout: "48h",
});

if (approval === null) {
  // Timeout: no approval received within 48 hours
  await step.run("notify-timeout", async () => {
    await notifyManager("Expense approval timed out");
  });
  return { status: "timed_out" };
}

// approval contains the full event payload
await step.run("process-approved-expense", async () => {
  await processExpense(approval.data);
});
```

#### Human-in-the-Loop Pattern

```typescript
const humanReview = inngest.createFunction(
  { id: "content-review" },
  { event: "content/submitted" },
  async ({ event, step }) => {
    // Step 1: AI generates initial review
    const aiReview = await step.run("ai-review", async () => {
      return await aiReviewContent(event.data.content);
    });

    // Step 2: If AI is uncertain, request human review
    if (aiReview.confidence < 0.8) {
      // Notify human reviewer
      await step.run("request-human-review", async () => {
        await sendToReviewQueue(event.data.contentId, aiReview);
      });

      // Wait for human to submit their review
      const humanDecision = await step.waitForEvent("await-human-review", {
        event: "content/reviewed",
        match: "data.contentId",
        timeout: "72h",
      });

      if (humanDecision === null) {
        return { status: "escalated", reason: "review_timeout" };
      }

      return { status: humanDecision.data.decision, reviewer: "human" };
    }

    return { status: aiReview.decision, reviewer: "ai" };
  }
);
```

#### Using `if` for Complex Matching

```typescript
const event = await step.waitForEvent("wait-for-large-order", {
  event: "order/placed",
  if: "async.data.userId == event.data.userId && async.data.total > 1000",
  timeout: "30d",
});
// `async` refers to the incoming (awaited) event
// `event` refers to the original triggering event
```

### `step.sendEvent(id, event | event[])` -- Emit Events

Send events from within a durable function. The send is memoized (won't re-send on replay).

```typescript
// Send a single event
await step.sendEvent("notify-completion", {
  name: "order/fulfilled",
  data: {
    orderId: event.data.orderId,
    fulfilledAt: new Date().toISOString(),
  },
});

// Send multiple events (fan-out)
await step.sendEvent("trigger-notifications", [
  {
    name: "notification/email",
    data: { userId: event.data.userId, template: "order-complete" },
  },
  {
    name: "notification/push",
    data: { userId: event.data.userId, message: "Your order is ready!" },
  },
  {
    name: "analytics/track",
    data: { event: "order_fulfilled", orderId: event.data.orderId },
  },
]);
```

### `step.invoke(id, options)` -- Call Another Function

Invoke another Inngest function and wait for its result. Useful for composing complex workflows from smaller, reusable functions.

```typescript
// Define a reusable sub-function
const sendEmail = inngest.createFunction(
  { id: "send-email" },
  { event: "email/send" },
  async ({ event }) => {
    const result = await emailProvider.send({
      to: event.data.to,
      subject: event.data.subject,
      body: event.data.body,
    });
    return { messageId: result.id, status: "sent" };
  }
);

// Invoke it from another function
const parentWorkflow = inngest.createFunction(
  { id: "onboarding-workflow" },
  { event: "user/signup" },
  async ({ event, step }) => {
    const user = await step.run("create-user", async () => {
      return await createUser(event.data);
    });

    // Invoke the email function and wait for its result
    const emailResult = await step.invoke("send-welcome-email", {
      function: sendEmail,
      data: {
        to: user.email,
        subject: "Welcome!",
        body: "Thanks for signing up.",
      },
      timeout: "5m",
    });

    return { userId: user.id, emailId: emailResult.messageId };
  }
);
```

---

## Workflow Patterns

### Sequential Steps

Steps run in sequence by default when you `await` each one:

```typescript
async ({ event, step }) => {
  const a = await step.run("step-a", async () => fetchData());
  const b = await step.run("step-b", async () => processData(a));
  const c = await step.run("step-c", async () => saveResults(b));
  return c;
};
```

### Parallel Steps (Fan-Out)

Run multiple steps concurrently using `Promise.all()`:

```typescript
async ({ event, step }) => {
  // These three steps run in parallel
  const [userData, orderHistory, recommendations] = await Promise.all([
    step.run("fetch-user", async () => {
      return await db.users.findById(event.data.userId);
    }),
    step.run("fetch-orders", async () => {
      return await db.orders.findByUser(event.data.userId);
    }),
    step.run("fetch-recommendations", async () => {
      return await recommendations.getForUser(event.data.userId);
    }),
  ]);

  // This step runs after all parallel steps complete
  const dashboard = await step.run("build-dashboard", async () => {
    return buildDashboard(userData, orderHistory, recommendations);
  });

  return dashboard;
};
```

**How parallel steps work internally:**
1. On first invocation, Inngest discovers all three parallel steps
2. It schedules them to run concurrently
3. Each step's result is memoized independently
4. Once all are complete, the function is invoked again and all results are replayed
5. Execution continues past the `Promise.all()`

### Dynamic Fan-Out (Parallel Over a List)

```typescript
async ({ event, step }) => {
  const items = await step.run("fetch-items", async () => {
    return await db.items.findByBatchId(event.data.batchId);
  });

  // Process all items in parallel
  const results = await Promise.all(
    items.map((item) =>
      step.run(`process-item-${item.id}`, async () => {
        return await processItem(item);
      })
    )
  );

  // Aggregate results
  const summary = await step.run("aggregate", async () => {
    return aggregateResults(results);
  });

  return summary;
};
```

### Conditional Branching

```typescript
async ({ event, step }) => {
  const analysis = await step.run("analyze", async () => {
    return await analyzeRequest(event.data);
  });

  if (analysis.requiresManualReview) {
    // Branch A: Human review path
    await step.run("flag-for-review", async () => {
      await reviewQueue.add(event.data.id);
    });

    const decision = await step.waitForEvent("wait-for-review", {
      event: "request/reviewed",
      match: "data.requestId",
      timeout: "48h",
    });

    if (!decision || decision.data.approved === false) {
      await step.run("reject", async () => {
        await rejectRequest(event.data.id);
      });
      return { status: "rejected" };
    }
  }

  // Branch B: Auto-approved path (or after manual approval)
  const result = await step.run("execute", async () => {
    return await executeRequest(event.data);
  });

  return { status: "completed", result };
};
```

### Saga Pattern (Compensation Flow)

When a multi-step workflow fails partway through, you may need to undo previous steps:

```typescript
const bookTrip = inngest.createFunction(
  {
    id: "book-trip",
    retries: 0,  // No retries for the saga -- handle failures explicitly
  },
  { event: "trip/book" },
  async ({ event, step }) => {
    // Step 1: Book flight
    const flight = await step.run("book-flight", async () => {
      return await flightService.book(event.data.flight);
    });

    // Step 2: Book hotel
    let hotel;
    try {
      hotel = await step.run("book-hotel", async () => {
        return await hotelService.book(event.data.hotel);
      });
    } catch (error) {
      // Compensate: cancel the flight
      await step.run("cancel-flight", async () => {
        await flightService.cancel(flight.bookingId);
      });
      throw error;
    }

    // Step 3: Book car
    let car;
    try {
      car = await step.run("book-car", async () => {
        return await carService.book(event.data.car);
      });
    } catch (error) {
      // Compensate: cancel flight and hotel
      await Promise.all([
        step.run("cancel-flight-2", async () => {
          await flightService.cancel(flight.bookingId);
        }),
        step.run("cancel-hotel", async () => {
          await hotelService.cancel(hotel.bookingId);
        }),
      ]);
      throw error;
    }

    return {
      flight: flight.bookingId,
      hotel: hotel.bookingId,
      car: car.bookingId,
    };
  }
);
```

### Loop Pattern

```typescript
async ({ event, step }) => {
  let cursor: string | null = null;
  let allResults: any[] = [];
  let page = 0;

  do {
    const batch = await step.run(`fetch-page-${page}`, async () => {
      return await api.fetchPage({ cursor, limit: 100 });
    });

    await step.run(`process-page-${page}`, async () => {
      await processBatch(batch.items);
    });

    allResults = [...allResults, ...batch.items];
    cursor = batch.nextCursor;
    page++;
  } while (cursor !== null);

  return { totalProcessed: allResults.length };
};
```

**Important**: Step IDs must be unique, so include dynamic values (like page number) in the ID.

### Scheduled/Cron Workflows

```typescript
const dailyReport = inngest.createFunction(
  { id: "daily-report" },
  { cron: "TZ=America/New_York 0 9 * * MON-FRI" },
  async ({ step }) => {
    const data = await step.run("gather-metrics", async () => {
      return await gatherDailyMetrics();
    });

    const report = await step.run("generate-report", async () => {
      return await generateReport(data);
    });

    await step.run("send-report", async () => {
      await sendToSlack(report);
      await sendEmail(report, "team@company.com");
    });
  }
);
```

### Event Coordination (Wait for Multiple Events)

```typescript
async ({ event, step }) => {
  // Wait for both payment and shipping confirmation
  const [payment, shipping] = await Promise.all([
    step.waitForEvent("wait-payment", {
      event: "payment/confirmed",
      match: "data.orderId",
      timeout: "1h",
    }),
    step.waitForEvent("wait-shipping", {
      event: "shipping/confirmed",
      match: "data.orderId",
      timeout: "7d",
    }),
  ]);

  if (!payment) {
    throw new Error("Payment timeout");
  }

  await step.run("complete-order", async () => {
    await markOrderComplete(event.data.orderId, {
      paymentId: payment.data.paymentId,
      trackingNumber: shipping?.data.trackingNumber ?? null,
    });
  });
};
```

### Cancellation Pattern

```typescript
const longRunningProcess = inngest.createFunction(
  {
    id: "long-process",
    cancelOn: [
      {
        event: "process/cancel",
        match: "data.processId",   // Cancel when processId matches
      },
    ],
  },
  { event: "process/start" },
  async ({ event, step }) => {
    // If "process/cancel" with matching processId is received,
    // this function is immediately cancelled
    await step.run("phase-1", async () => { /* ... */ });
    await step.sleep("wait", "1h");
    await step.run("phase-2", async () => { /* ... */ });
  }
);
```

### Debounced Execution

```typescript
const syncUser = inngest.createFunction(
  {
    id: "sync-user",
    debounce: {
      period: "10s",
      key: "event.data.userId",
    },
  },
  { event: "user/updated" },
  async ({ event, step }) => {
    // Only runs once after 10s of no new "user/updated" events
    // for the same userId. Uses the LATEST event data.
    await step.run("sync", async () => {
      await syncUserToExternalSystem(event.data);
    });
  }
);
```

## Best Practices

1. **Keep steps small and focused**: Each step should do one thing. This maximizes the benefit of individual retry and memoization.

2. **Use descriptive step IDs**: Step IDs appear in the dashboard and logs. Use kebab-case names like `"validate-payment"` not `"s1"`.

3. **Ensure step IDs are unique**: Dynamic steps (in loops or maps) must include unique identifiers in the step ID string.

4. **Return serializable data**: Step return values are stored as JSON. Convert Dates to ISO strings, strip non-serializable properties.

5. **Don't perform side effects outside steps**: Any code outside `step.run()` will re-execute on every replay. Put all side effects inside steps.

6. **Use parallel steps for independent work**: `Promise.all()` with multiple `step.run()` calls is both faster and properly handled by Inngest.

7. **Prefer `step.sendEvent` over `inngest.send`**: Inside functions, use `step.sendEvent` to ensure event sends are durable and memoized.

8. **Set appropriate timeouts on `waitForEvent`**: Always set a timeout and handle the `null` (timeout) case.
