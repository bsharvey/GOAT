---
archetypes: [jarvis]
skills: [workflow, operational-planning]
training_cluster: 02-workflow-orchestrator
domain: orchestration
difficulty: advanced
version: 1.0
---
# Temporal Concepts (Future Migration Reference)

> Source: https://docs.temporal.io/concepts
> Training material for JARVIS Workflow Orchestrator Agent
> Note: Temporal is the planned migration target for advanced workflow orchestration needs

---

## What Is Temporal?

Temporal is an **open-source durable execution platform** that enables developers to build scalable, reliable applications by abstracting away the complexity of distributed systems. It guarantees that workflow code runs to completion, even in the presence of failures, crashes, and infrastructure outages.

Key differentiators from Inngest:
- **Self-hosted first** (with Temporal Cloud as managed option)
- **Persistent workers** (your code runs on long-lived worker processes, not invoked via HTTP)
- **Multi-language SDKs** (Go, Java, TypeScript, Python, .NET, PHP)
- **Deterministic replay** (workflows must be deterministic -- side effects go in activities)
- **More granular control** over queues, workers, and scaling

## Core Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   Your App /      |     |   Temporal        |     |   Worker          |
|   Starter         |     |   Server          |     |   Process(es)     |
|                   |     |                   |     |                   |
|  client.start()   |---->|  Event History    |---->|  Workflow Code    |
|  client.signal()  |---->|  Task Queues      |---->|  Activity Code    |
|  client.query()   |---->|  Scheduler        |     |                   |
|                   |     |  Visibility Store  |<----|  (heartbeats,     |
|                   |     |                   |     |   results)        |
+-------------------+     +-------------------+     +-------------------+
```

## Core Concepts

### 1. Workflows

A **Workflow** is a durable function that orchestrates your business logic. Workflows are:

- **Deterministic**: Given the same input, a workflow always produces the same sequence of commands
- **Durable**: Survive worker crashes, server restarts, and infrastructure failures
- **Long-running**: Can execute for seconds, hours, days, or even years
- **Event-sourced**: Every state change is recorded as an event in the workflow's history

```typescript
// TypeScript SDK example
import { proxyActivities, sleep, defineSignal, setHandler, condition } from '@temporalio/workflow';
import type * as activities from './activities';

const { sendEmail, chargePayment, fulfillOrder } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30s',
  retry: {
    maximumAttempts: 5,
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
  },
});

export async function orderWorkflow(order: Order): Promise<OrderResult> {
  // Step 1: Validate and charge payment
  const payment = await chargePayment(order);

  // Step 2: Sleep durably (workflow is suspended, worker is freed)
  await sleep('5 minutes');

  // Step 3: Fulfill order
  const fulfillment = await fulfillOrder(order, payment);

  // Step 4: Send confirmation
  await sendEmail(order.customerEmail, 'Order confirmed', fulfillment);

  return { orderId: order.id, status: 'completed' };
}
```

**Workflow Constraints (Determinism Rules):**
- No direct I/O (network calls, file system, databases) -- use Activities instead
- No random number generation -- use `workflow.random()` instead
- No current time -- use `workflow.now()` instead
- No threading/goroutines -- use `workflow.execute*` instead
- No mutable global state

### 2. Activities

**Activities** are the building blocks for non-deterministic operations (I/O, API calls, database queries). They are the "side effects" of your workflow.

```typescript
// activities.ts
import { Context } from '@temporalio/activity';

export async function chargePayment(order: Order): Promise<PaymentResult> {
  // Activities CAN do I/O, call APIs, access databases
  const result = await paymentGateway.charge({
    amount: order.total,
    customerId: order.customerId,
  });

  // Heartbeat for long-running activities
  Context.current().heartbeat('payment charged');

  return { transactionId: result.id, status: 'charged' };
}

export async function sendEmail(
  to: string,
  subject: string,
  data: any
): Promise<void> {
  await emailService.send({ to, subject, body: renderTemplate(data) });
}

export async function fulfillOrder(
  order: Order,
  payment: PaymentResult
): Promise<FulfillmentResult> {
  const tracking = await fulfillmentService.createShipment(order);
  return { trackingNumber: tracking.id, carrier: tracking.carrier };
}
```

**Activity Configuration:**

```typescript
const { myActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30s',        // Max time for single attempt
  scheduleToCloseTimeout: '5m',      // Max time including retries
  scheduleToStartTimeout: '10s',     // Max time waiting in queue
  heartbeatTimeout: '10s',           // Max time between heartbeats
  retry: {
    maximumAttempts: 5,              // Max retry attempts
    initialInterval: '1s',          // First retry delay
    backoffCoefficient: 2.0,        // Exponential backoff multiplier
    maximumInterval: '60s',         // Max delay between retries
    nonRetryableErrorTypes: ['InvalidInputError'], // Skip retries for these
  },
});
```

### 3. Task Queues

**Task Queues** are the mechanism for routing workflow and activity tasks to the appropriate workers.

```typescript
// Worker listening on a specific task queue
const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities,
  taskQueue: 'order-processing',     // This worker handles order tasks
});

// Starting a workflow on a specific task queue
const handle = await client.workflow.start(orderWorkflow, {
  taskQueue: 'order-processing',
  workflowId: `order-${orderId}`,
  args: [orderData],
});
```

**Task Queue Properties:**
- Workers poll task queues for work (pull model, not push)
- Multiple workers can listen on the same task queue (load balancing)
- Different task queues can have different workers with different capabilities
- Activities can be routed to different task queues than their parent workflow

### 4. Signals

**Signals** are asynchronous messages sent to a running workflow from the outside world. They are the primary mechanism for **human-in-the-loop** interactions.

```typescript
// Define a signal in the workflow file
import { defineSignal, setHandler, condition } from '@temporalio/workflow';

const approvalSignal = defineSignal<[{ approved: boolean; approver: string }]>('approval');

export async function expenseWorkflow(expense: Expense): Promise<ExpenseResult> {
  let approvalResult: { approved: boolean; approver: string } | undefined;

  // Register signal handler
  setHandler(approvalSignal, (result) => {
    approvalResult = result;
  });

  // Submit for approval
  await submitForApproval(expense);

  // Wait for the signal (with timeout)
  const gotApproval = await condition(() => approvalResult !== undefined, '48h');

  if (!gotApproval) {
    return { status: 'timed_out' };
  }

  if (!approvalResult!.approved) {
    return { status: 'rejected', rejectedBy: approvalResult!.approver };
  }

  // Process approved expense
  await processExpense(expense);
  return { status: 'approved', approvedBy: approvalResult!.approver };
}

// Send a signal from outside (e.g., from an API handler)
const handle = client.workflow.getHandle('expense-' + expenseId);
await handle.signal(approvalSignal, { approved: true, approver: 'manager@co.com' });
```

**Signal Properties:**
- Signals are **asynchronous** -- the sender does not wait for a response
- Signals are **durable** -- they are persisted in the workflow history
- Multiple signals can be sent to the same workflow
- Signal handlers can mutate workflow state
- Signals can carry data payloads

### 5. Queries

**Queries** are synchronous read-only operations that inspect the current state of a running workflow. They do not mutate state.

```typescript
import { defineQuery, setHandler } from '@temporalio/workflow';

const getStatusQuery = defineQuery<WorkflowStatus>('getStatus');
const getProgressQuery = defineQuery<number>('getProgress');

export async function batchProcessWorkflow(items: Item[]): Promise<void> {
  let processedCount = 0;
  let status: WorkflowStatus = 'running';

  // Register query handlers
  setHandler(getStatusQuery, () => status);
  setHandler(getProgressQuery, () =>
    items.length > 0 ? (processedCount / items.length) * 100 : 0
  );

  for (const item of items) {
    await processItem(item);
    processedCount++;
  }

  status = 'completed';
}

// Query from outside
const handle = client.workflow.getHandle('batch-123');
const status = await handle.query(getStatusQuery);          // 'running'
const progress = await handle.query(getProgressQuery);      // 75.5
```

**Query Properties:**
- Queries are **synchronous** -- the caller receives the result immediately
- Queries are **read-only** -- they must not mutate workflow state
- Queries return the **current state** at the time of the query
- Query handlers run in the workflow's execution context

### 6. Workers

**Workers** are processes that execute workflow and activity code. They are hosted and managed by you.

```typescript
import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';

async function run() {
  // Connect to Temporal server
  const connection = await NativeConnection.connect({
    address: 'temporal.example.com:7233',
    tls: {
      clientCertPair: {
        crt: fs.readFileSync('client.crt'),
        key: fs.readFileSync('client.key'),
      },
    },
  });

  const worker = await Worker.create({
    connection,
    namespace: 'production',
    taskQueue: 'my-task-queue',
    workflowsPath: require.resolve('./workflows'),
    activities,
    // Worker tuning
    maxConcurrentActivityTaskExecutions: 100,
    maxConcurrentWorkflowTaskExecutions: 50,
    maxCachedWorkflows: 1000,
  });

  // Start polling for tasks
  await worker.run();
}

run().catch(console.error);
```

**Worker Properties:**
- Workers **poll** the Temporal server for tasks (pull model)
- Workers execute workflow and activity code in **separate threads/contexts**
- Workers can be **scaled horizontally** by running multiple instances on the same task queue
- Workers are **stateless** -- all state is on the Temporal server
- Workers handle **heartbeating** for long-running activities

### 7. Workflow Execution

A **Workflow Execution** is a single run of a workflow function. It has a unique identifier.

```typescript
import { Client, Connection } from '@temporalio/client';

const connection = await Connection.connect({ address: 'localhost:7233' });
const client = new Client({ connection });

// Start a workflow
const handle = await client.workflow.start(orderWorkflow, {
  taskQueue: 'order-processing',
  workflowId: `order-${orderId}`,   // Must be unique (or use for idempotency)
  args: [orderData],
  // Optional configuration
  workflowExecutionTimeout: '24h',   // Max total time
  workflowRunTimeout: '1h',          // Max single run time
  workflowTaskTimeout: '10s',        // Max time for a single workflow task
  memo: { customer: 'John Doe' },    // Searchable metadata
  searchAttributes: {                // Indexed attributes for visibility
    CustomerId: ['cust-123'],
    OrderTotal: [99.99],
  },
  retryPolicy: {
    maximumAttempts: 3,
  },
});

// Get the result
const result = await handle.result();

// Or interact with the running workflow
await handle.signal(approvalSignal, { approved: true, approver: 'admin' });
const status = await handle.query(getStatusQuery);
await handle.cancel();
await handle.terminate('Emergency shutdown');
```

### 8. Child Workflows

Workflows can start other workflows as **child workflows** for modularity and independent lifecycle management.

```typescript
import { executeChild, startChild } from '@temporalio/workflow';

export async function parentWorkflow(data: ParentData): Promise<void> {
  // Execute child and wait for result
  const result = await executeChild(childWorkflow, {
    workflowId: `child-${data.id}`,
    args: [data.childInput],
    taskQueue: 'child-queue',        // Can be different from parent
    parentClosePolicy: 'TERMINATE',  // What happens to child if parent closes
  });

  // Or start child without waiting (fire-and-forget)
  const childHandle = await startChild(anotherChildWorkflow, {
    workflowId: `async-child-${data.id}`,
    args: [data.asyncInput],
    parentClosePolicy: 'ABANDON',    // Child continues if parent closes
  });

  // Can signal child workflows
  await childHandle.signal(someSignal, signalData);
}
```

**Parent Close Policies:**

| Policy | Behavior |
|--------|----------|
| `TERMINATE` | Child is terminated when parent closes |
| `REQUEST_CANCEL` | Cancellation is requested on child when parent closes |
| `ABANDON` | Child continues running independently |

### 9. Timers and Sleep

```typescript
import { sleep } from '@temporalio/workflow';

export async function reminderWorkflow(userId: string): Promise<void> {
  // Durable sleep -- workflow is suspended, no resources consumed
  await sleep('7 days');

  await sendReminder(userId);

  // Can sleep for very long durations
  await sleep('30 days');

  await sendFinalReminder(userId);
}
```

### 10. Continue-As-New

For workflows that need to run indefinitely (e.g., entity workflows), use `continueAsNew` to prevent unbounded history growth.

```typescript
import { continueAsNew, sleep } from '@temporalio/workflow';

export async function pollingWorkflow(url: string, iteration: number = 0): Promise<void> {
  const result = await checkEndpoint(url);

  if (result.status === 'complete') {
    await notifyCompletion(result);
    return; // Workflow ends
  }

  await sleep('1 minute');

  // Reset the workflow history by continuing as new
  // This prevents history from growing unbounded
  await continueAsNew<typeof pollingWorkflow>(url, iteration + 1);
}
```

## Temporal Retry Policies

### Activity Retry Policy

```typescript
const retryPolicy: RetryPolicy = {
  initialInterval: '1s',         // First retry delay
  backoffCoefficient: 2.0,       // Multiplier for each subsequent retry
  maximumInterval: '1m',         // Cap on retry delay
  maximumAttempts: 10,           // Max attempts (0 = unlimited)
  nonRetryableErrorTypes: [      // Error types that skip retry
    'InvalidInputError',
    'NotFoundError',
  ],
};
```

### Workflow Retry Policy

```typescript
const handle = await client.workflow.start(myWorkflow, {
  taskQueue: 'my-queue',
  workflowId: 'my-workflow-id',
  args: [input],
  retryPolicy: {
    initialInterval: '10s',
    backoffCoefficient: 2.0,
    maximumInterval: '5m',
    maximumAttempts: 5,
  },
});
```

## Saga Pattern in Temporal

The Saga pattern handles distributed transactions with compensation:

```typescript
import { proxyActivities, ApplicationFailure } from '@temporalio/workflow';

const {
  bookFlight, cancelFlight,
  bookHotel, cancelHotel,
  bookCar, cancelCar,
  chargeCustomer, refundCustomer,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '30s',
  retry: { maximumAttempts: 3 },
});

export async function bookTripSaga(trip: TripRequest): Promise<TripResult> {
  const compensations: Array<() => Promise<void>> = [];

  try {
    // Step 1: Book flight
    const flight = await bookFlight(trip.flight);
    compensations.push(() => cancelFlight(flight.bookingId));

    // Step 2: Book hotel
    const hotel = await bookHotel(trip.hotel);
    compensations.push(() => cancelHotel(hotel.bookingId));

    // Step 3: Book car
    const car = await bookCar(trip.car);
    compensations.push(() => cancelCar(car.bookingId));

    // Step 4: Charge customer
    const payment = await chargeCustomer(trip.customerId, trip.totalAmount);
    compensations.push(() => refundCustomer(payment.transactionId));

    return { flight, hotel, car, payment, status: 'confirmed' };

  } catch (error) {
    // Execute compensations in reverse order
    console.log('Saga failed, running compensations...');
    for (const compensation of compensations.reverse()) {
      try {
        await compensation();
      } catch (compensationError) {
        // Log but continue with remaining compensations
        console.error('Compensation failed:', compensationError);
      }
    }
    throw ApplicationFailure.nonRetryable(
      `Trip booking failed: ${error}. All compensations executed.`
    );
  }
}
```

## Namespaces

Namespaces provide **multi-tenancy** and **isolation** within a Temporal cluster.

```typescript
const client = new Client({
  connection,
  namespace: 'production',    // Logical isolation boundary
});
```

- Each namespace has its own workflow history, task queues, and search attributes
- Namespaces are used to separate environments (dev, staging, production)
- Namespaces can have different retention periods for workflow history

## Visibility and Search Attributes

Temporal provides a **Visibility** subsystem for querying workflow executions:

```typescript
// List workflows with filters
const workflows = client.workflow.list({
  query: `
    WorkflowType = 'orderWorkflow'
    AND ExecutionStatus = 'Running'
    AND CustomerId = 'cust-123'
    AND StartTime > '2025-01-01T00:00:00Z'
  `,
});

for await (const workflow of workflows) {
  console.log(workflow.workflowId, workflow.status);
}
```

## Temporal vs. Inngest -- Comparison

| Feature | Inngest | Temporal |
|---------|---------|---------|
| **Hosting** | Cloud-first (self-host option) | Self-host first (cloud option) |
| **Execution model** | HTTP invocation (serverless) | Worker polling (long-lived processes) |
| **Language support** | TypeScript/JavaScript | Go, Java, TS, Python, .NET, PHP |
| **Determinism** | Not required (memoization) | Required (event sourcing) |
| **Setup complexity** | Minutes (npm install + serve) | Hours (server + workers + DB) |
| **Scaling** | Automatic (serverless) | Manual (scale workers yourself) |
| **Event system** | Built-in first-class events | External (use signals/messages) |
| **Concurrency control** | Built-in (config-based) | Manual (task queue design) |
| **Human-in-the-loop** | `step.waitForEvent()` | Signals + `condition()` |
| **Use case fit** | Event-driven serverless apps | Complex distributed systems |
| **Debugging** | Web dashboard | Web UI + tctl CLI |
| **Cost model** | Per-execution pricing | Infrastructure + hosting costs |

## Migration Considerations (Inngest to Temporal)

When migrating from Inngest to Temporal:

1. **Steps become Activities**: `step.run()` maps to activity executions
2. **Events become Signals**: `step.waitForEvent()` maps to signals + `condition()`
3. **Sleep is the same**: `step.sleep()` maps directly to `sleep()`
4. **Serve handler becomes Worker**: HTTP endpoint becomes a long-lived worker process
5. **Concurrency moves to Task Queues**: Inngest config-based concurrency becomes task queue design
6. **onFailure becomes try/catch + saga**: Failure handlers become explicit compensation logic
7. **Fan-out uses Promise.all**: Both platforms support parallel execution with `Promise.all()`
8. **Determinism constraint**: Workflow code in Temporal must be deterministic -- move all I/O to activities

```typescript
// Inngest
const fn = inngest.createFunction(
  { id: "process-order" },
  { event: "order/placed" },
  async ({ event, step }) => {
    const data = await step.run("fetch", () => fetchData(event.data.id));
    await step.sleep("wait", "5m");
    await step.run("process", () => processData(data));
  }
);

// Temporal equivalent
export async function processOrder(orderId: string): Promise<void> {
  const data = await fetchData(orderId);         // Activity call
  await sleep('5 minutes');                       // Durable timer
  await processData(data);                        // Activity call
}
```
