---
archetypes: [jarvis]
skills: [infrastructure, workflow]
training_cluster: 01-infrastructure-architect
domain: infrastructure
difficulty: intermediate
version: 1.0
---
# Cloudflare Queues - Training Reference

> Training material for JARVIS Infrastructure Architect agent.
> Source: https://developers.cloudflare.com/queues/

---

## 1. Overview

Cloudflare Queues is a global message queue service built into the Workers platform. It enables asynchronous communication between Workers (or external producers) using a reliable, at-least-once delivery model.

### Key Properties
- **Integrated with Workers**: Producers and consumers are Workers
- **At-least-once delivery**: Messages are guaranteed to be delivered at least once
- **Batching**: Messages are delivered in batches for efficient processing
- **Retries**: Failed messages are automatically retried with backoff
- **Dead Letter Queues (DLQ)**: Messages that exceed retry limits are sent to a DLQ
- **Pull-based consumers**: Workers pull batches of messages (not push)
- **Global availability**: Queue is accessible from any Cloudflare data center
- **Scale-to-zero**: Consumer Workers only run when messages are available

---

## 2. Architecture

```
┌────────────┐     ┌───────────────┐     ┌────────────────┐
│ Producer   │────>│  Cloudflare   │────>│  Consumer      │
│ Worker     │     │  Queue        │     │  Worker        │
└────────────┘     │               │     │                │
                   │ ┌───────────┐ │     │ queue(batch) { │
┌────────────┐     │ │ Messages  │ │     │   for msg ...  │
│ HTTP API   │────>│ │ ┌─┐┌─┐┌─┐│ │     │   msg.ack()    │
│ (external) │     │ │ └─┘└─┘└─┘│ │     │ }              │
└────────────┘     │ └───────────┘ │     └────────────────┘
                   │               │
                   │  On failure:  │     ┌────────────────┐
                   │  ┌──────────┐ │     │  Dead Letter   │
                   │  │ Retry    │─│────>│  Queue         │
                   │  └──────────┘ │     └────────────────┘
                   └───────────────┘
```

---

## 3. Configuration

### wrangler.toml

```toml
name = "my-worker"
main = "src/index.ts"

# Producer binding (allows this Worker to send messages to the queue)
[[queues.producers]]
queue = "my-queue"
binding = "MY_QUEUE"

# Consumer configuration (this Worker processes messages from the queue)
[[queues.consumers]]
queue = "my-queue"
max_batch_size = 10          # Max messages per batch (default: 10, max: 100)
max_batch_timeout = 30       # Max seconds to wait for a full batch (default: 5, max: 60)
max_retries = 3              # Max retries before DLQ (default: 3)
dead_letter_queue = "my-dlq" # Optional: DLQ for failed messages
max_concurrency = 10         # Optional: max concurrent consumer invocations (default: varies)
retry_delay = 60             # Optional: seconds to wait before retry (default varies)

# You can produce to one queue and consume from another
[[queues.producers]]
queue = "my-dlq"
binding = "DLQ"
```

### Creating a Queue via CLI

```bash
# Create a queue
npx wrangler queues create my-queue

# Create a dead letter queue
npx wrangler queues create my-dlq

# List queues
npx wrangler queues list

# Delete a queue
npx wrangler queues delete my-queue
```

---

## 4. Producer API

### Sending Messages from a Worker

```javascript
export default {
  async fetch(request, env) {
    // Send a single message
    await env.MY_QUEUE.send({
      type: "email",
      to: "user@example.com",
      subject: "Welcome!",
      body: "Hello from Queues",
    });

    // Send with explicit content type
    await env.MY_QUEUE.send("plain text message", {
      contentType: "text",  // "json" (default), "text", "bytes", "v8"
    });

    // Send binary data
    await env.MY_QUEUE.send(new ArrayBuffer(8), {
      contentType: "bytes",
    });

    // Send with V8-serialized content (supports Maps, Sets, Dates, etc.)
    await env.MY_QUEUE.send(new Map([["key", "value"]]), {
      contentType: "v8",
    });

    return new Response("Messages sent");
  },
};
```

### Sending Batches

```javascript
export default {
  async fetch(request, env) {
    // Send multiple messages in a single API call (more efficient)
    await env.MY_QUEUE.sendBatch([
      {
        body: { task: "process-image", imageId: "img-001" },
        // Optional: contentType per message
      },
      {
        body: { task: "process-image", imageId: "img-002" },
      },
      {
        body: { task: "process-image", imageId: "img-003" },
        // Optional: delay delivery by N seconds
        delaySeconds: 60,
      },
    ]);

    return new Response("Batch sent");
  },
};
```

### Sending Messages via HTTP (External Producers)

Queues can also be written to via the Cloudflare REST API:

```bash
curl -X POST \
  "https://api.cloudflare.com/client/v4/accounts/{account_id}/queues/{queue_id}/messages" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Hello from outside Workers",
    "content_type": "text"
  }'
```

---

## 5. Consumer API

### Basic Consumer

```javascript
export default {
  // The queue handler receives batches of messages
  async queue(batch, env) {
    // batch.queue: queue name
    // batch.messages: array of Message objects

    console.log(`Processing ${batch.messages.length} messages from ${batch.queue}`);

    for (const msg of batch.messages) {
      try {
        // msg.id: unique message ID
        // msg.timestamp: when the message was enqueued (Date)
        // msg.body: the message payload (deserialized)
        // msg.attempts: number of delivery attempts

        console.log(`Message ${msg.id}: ${JSON.stringify(msg.body)}`);
        console.log(`Attempt: ${msg.attempts}`);

        await processMessage(msg.body);

        // Acknowledge successful processing
        msg.ack();
      } catch (error) {
        // Retry this specific message
        msg.retry({
          delaySeconds: 30, // optional: delay before retry
        });
      }
    }
  },
};

async function processMessage(body) {
  // Your processing logic here
}
```

### Batch-Level Acknowledgment

```javascript
export default {
  async queue(batch, env) {
    try {
      // Process all messages
      const results = await Promise.all(
        batch.messages.map((msg) => processMessage(msg.body))
      );

      // Acknowledge all messages at once
      batch.ackAll();
    } catch (error) {
      // Retry all messages
      batch.retryAll({
        delaySeconds: 60,
      });
    }
  },
};
```

### Implicit Acknowledgment

If you don't explicitly `ack()` or `retry()` messages:
- If the `queue()` handler returns successfully, all messages are **implicitly acked**
- If the `queue()` handler throws an error, all messages are **implicitly retried**

```javascript
export default {
  async queue(batch, env) {
    // If this completes without throwing, all messages are acked
    for (const msg of batch.messages) {
      await processMessage(msg.body);
    }
    // Implicit ack for all messages
  },
};
```

---

## 6. Consumer Concurrency

```toml
# wrangler.toml
[[queues.consumers]]
queue = "my-queue"
max_concurrency = 20  # Up to 20 consumer invocations in parallel
```

- Default concurrency scales automatically based on queue depth
- Setting `max_concurrency` caps the number of concurrent consumer invocations
- Each invocation receives up to `max_batch_size` messages
- Useful for controlling load on downstream services

---

## 7. Message Delays

Messages can be delayed at send time:

```javascript
// Delay a single message
await env.MY_QUEUE.send(
  { task: "send-reminder" },
  { delaySeconds: 3600 } // 1 hour delay
);

// Delay in a batch
await env.MY_QUEUE.sendBatch([
  { body: { step: 1 }, delaySeconds: 0 },     // Immediate
  { body: { step: 2 }, delaySeconds: 300 },   // 5 minutes
  { body: { step: 3 }, delaySeconds: 600 },   // 10 minutes
]);
```

Maximum delay: 12 hours (43,200 seconds).

---

## 8. Dead Letter Queues (DLQ)

When a message exceeds `max_retries`, it is moved to the DLQ:

```toml
# wrangler.toml
# Main queue
[[queues.consumers]]
queue = "my-queue"
max_retries = 3
dead_letter_queue = "my-dlq"

# DLQ consumer (optional - process failed messages)
[[queues.consumers]]
queue = "my-dlq"
max_batch_size = 10
```

```javascript
export default {
  // Main queue consumer
  async queue(batch, env) {
    if (batch.queue === "my-queue") {
      for (const msg of batch.messages) {
        try {
          await processMessage(msg.body);
          msg.ack();
        } catch (e) {
          msg.retry(); // Will go to DLQ after max_retries
        }
      }
    }

    // DLQ consumer (same Worker or different)
    if (batch.queue === "my-dlq") {
      for (const msg of batch.messages) {
        // Log failed messages, alert, or attempt manual remediation
        console.error("DLQ message:", msg.body, "attempts:", msg.attempts);
        await alertOps(msg);
        msg.ack();
      }
    }
  },
};
```

---

## 9. Patterns

### Pattern 1: Fan-Out / Fan-In

```javascript
// Fan-out: One producer, multiple queues
export default {
  async fetch(request, env) {
    const order = await request.json();

    // Fan out to specialized processing queues
    await Promise.all([
      env.PAYMENT_QUEUE.send({ orderId: order.id, amount: order.total }),
      env.INVENTORY_QUEUE.send({ orderId: order.id, items: order.items }),
      env.NOTIFICATION_QUEUE.send({ orderId: order.id, email: order.email }),
    ]);

    return new Response("Order processing started");
  },
};
```

### Pattern 2: Pipeline (Multi-Stage Processing)

```toml
# wrangler.toml
[[queues.producers]]
queue = "stage-1"
binding = "STAGE_1"

[[queues.producers]]
queue = "stage-2"
binding = "STAGE_2"

[[queues.producers]]
queue = "stage-3"
binding = "STAGE_3"

[[queues.consumers]]
queue = "stage-1"

[[queues.consumers]]
queue = "stage-2"

[[queues.consumers]]
queue = "stage-3"
```

```javascript
export default {
  async queue(batch, env) {
    for (const msg of batch.messages) {
      switch (batch.queue) {
        case "stage-1":
          // Validate and enrich
          const enriched = await validate(msg.body);
          await env.STAGE_2.send(enriched);
          break;

        case "stage-2":
          // Transform
          const transformed = await transform(msg.body);
          await env.STAGE_3.send(transformed);
          break;

        case "stage-3":
          // Load/persist
          await persist(msg.body);
          break;
      }
      msg.ack();
    }
  },
};
```

### Pattern 3: Delayed Job Scheduling

```javascript
export default {
  async fetch(request, env) {
    const { action, delayMinutes } = await request.json();

    await env.JOB_QUEUE.send(
      { action, scheduledAt: new Date().toISOString() },
      { delaySeconds: delayMinutes * 60 }
    );

    return new Response("Job scheduled");
  },

  async queue(batch, env) {
    for (const msg of batch.messages) {
      console.log(`Executing job: ${msg.body.action}, scheduled at: ${msg.body.scheduledAt}`);
      await executeJob(msg.body);
      msg.ack();
    }
  },
};
```

### Pattern 4: Work Distribution with Backpressure

```javascript
export default {
  async queue(batch, env) {
    // Process messages with controlled concurrency within the batch
    const concurrencyLimit = 5;
    const chunks = [];

    for (let i = 0; i < batch.messages.length; i += concurrencyLimit) {
      chunks.push(batch.messages.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (msg) => {
          try {
            await heavyProcess(msg.body);
            msg.ack();
          } catch (e) {
            msg.retry({ delaySeconds: 60 });
          }
        })
      );
    }
  },
};
```

---

## 10. Pricing

### Free Tier
| Resource | Included |
|----------|----------|
| Messages sent | 1 million/month |
| Messages read | 1 million/month |
| Storage | Not specified |

### Paid Plan ($5/month Workers plan required)
| Resource | Included | Overage |
|----------|----------|---------|
| Standard operations (send, receive, ack) | 1 million/month | $0.40 per additional million |
| Message body size | Up to 128 KB per message | - |
| Batch size | Up to 100 messages | - |
| Maximum message delay | 12 hours | - |

---

## 11. Limits

| Resource | Limit |
|----------|-------|
| Message body size | 128 KB |
| Messages per batch (send) | 100 |
| Messages per batch (receive) | 100 (max_batch_size) |
| Max batch timeout | 60 seconds |
| Max retries | 100 |
| Max message delay | 12 hours (43,200 seconds) |
| Queues per account | 100 (can be increased) |
| Consumers per queue | 1 (one Worker) |
| Max concurrency | Configurable (default: auto-scaled) |

---

## 12. Key Architectural Considerations for JARVIS

1. **At-least-once delivery**: Consumers must be idempotent. Design message handlers to safely process the same message twice.
2. **Batching for throughput**: Use `sendBatch()` on the producer side and tune `max_batch_size` / `max_batch_timeout` on the consumer side for optimal throughput.
3. **One consumer per queue**: Each queue can only have one Worker consumer. For multiple processing paths, use separate queues.
4. **DLQ strategy**: Always configure a DLQ for production queues. Failed messages should be captured, not lost.
5. **Message ordering**: Queues provide best-effort ordering but do not guarantee strict FIFO. If ordering matters, include sequence numbers and handle reordering in the consumer.
6. **Backpressure**: Use `max_concurrency` to limit the load on downstream services. Combine with `retry({ delaySeconds })` for exponential backoff.
7. **Scale-to-zero**: Consumer Workers are only invoked when messages are available. No idle costs.
8. **Cross-Worker communication**: Queues are ideal for decoupling Workers. Producer and consumer can be different Workers or the same Worker.
9. **Message delays for scheduling**: Use `delaySeconds` for simple scheduled tasks. For complex scheduling, combine with Durable Object alarms.
