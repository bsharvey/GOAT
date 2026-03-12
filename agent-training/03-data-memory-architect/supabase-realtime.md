---
archetypes: [meridian, jarvis]
skills: [data-memory, system-integration]
training_cluster: 03-data-memory-architect
domain: data
difficulty: intermediate
version: 1.0
---
# Supabase Realtime: Channels, Broadcast, Presence, and Postgres Changes

## Overview

Supabase Realtime is a server built on top of Phoenix (Elixir) that enables three real-time
communication patterns over WebSocket connections:

1. **Broadcast** -- Send ephemeral, low-latency messages between clients through a channel
2. **Presence** -- Track and synchronize shared state (e.g., who is online) across clients
3. **Postgres Changes** -- Listen to INSERT, UPDATE, DELETE events on database tables via logical replication

For the JARVIS Data/Memory Architect, Realtime is the nervous system that propagates events from the
event store to read model projections, notifies agents of memory updates, and enables real-time
collaboration between agents.

---

## 1. Channels

Channels are the core abstraction in Supabase Realtime. A channel is a named topic that clients
subscribe to. All three features (Broadcast, Presence, Postgres Changes) operate through channels.

### Client Setup

```typescript
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!  // or service_role key for server-side
);

// Create a channel
const channel: RealtimeChannel = supabase.channel("jarvis-events", {
    config: {
        broadcast: {
            // Receive your own broadcasts (default: false)
            self: false,
            // Acknowledge message delivery (default: false)
            ack: false,
        },
        presence: {
            // The key used to identify this client in presence state
            key: "agent-data-architect",
        },
    },
});
```

### Channel Lifecycle

```typescript
// Subscribe to the channel (must be called to activate)
channel.subscribe((status: string, err?: Error) => {
    if (status === "SUBSCRIBED") {
        console.log("Connected to channel");
    }
    if (status === "CHANNEL_ERROR") {
        console.error("Channel error:", err);
    }
    if (status === "TIMED_OUT") {
        console.warn("Channel timed out, retrying...");
    }
    if (status === "CLOSED") {
        console.log("Channel closed");
    }
});

// Unsubscribe from the channel
await supabase.removeChannel(channel);

// Remove all channels
await supabase.removeAllChannels();
```

---

## 2. Broadcast

Broadcast sends ephemeral messages through a channel. Messages are NOT persisted -- they are
delivered to all subscribers in real-time and then gone. This is ideal for:

- Agent-to-agent communication signals
- Real-time UI updates
- Transient notifications (e.g., "memory consolidation started")
- Heartbeat / keep-alive signals

### Sending Broadcasts

```typescript
// Method 1: Send after subscribing
const channel = supabase.channel("agent-signals");

channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
        // Send a broadcast message
        channel.send({
            type: "broadcast",
            event: "memory-updated",
            payload: {
                memoryId: "abc-123",
                tier: 3,
                type: "semantic",
                action: "consolidated",
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Method 2: Send with acknowledgment
const channelWithAck = supabase.channel("agent-signals", {
    config: { broadcast: { ack: true } },
});

channelWithAck.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
        const result = await channelWithAck.send({
            type: "broadcast",
            event: "critical-alert",
            payload: { message: "Memory store approaching capacity" },
        });
        // result is "ok" if the server acknowledged receipt
        console.log("Broadcast acknowledged:", result);
    }
});
```

### Receiving Broadcasts

```typescript
const channel = supabase.channel("agent-signals");

// Listen for a specific event type
channel
    .on("broadcast", { event: "memory-updated" }, (payload) => {
        console.log("Memory updated:", payload.payload);
        // { memoryId: "abc-123", tier: 3, type: "semantic", action: "consolidated", ... }
    })
    .on("broadcast", { event: "critical-alert" }, (payload) => {
        console.log("Alert:", payload.payload.message);
    })
    .subscribe();
```

### Broadcast Patterns for JARVIS

```typescript
// Pattern: Fan-out event notifications to all agents
async function broadcastEventToAgents(
    eventType: string,
    eventData: Record<string, unknown>
): Promise<void> {
    const channel = supabase.channel("jarvis-event-bus", {
        config: { broadcast: { ack: true } },
    });

    await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
            if (status === "SUBSCRIBED") resolve();
        });
    });

    await channel.send({
        type: "broadcast",
        event: eventType,
        payload: {
            ...eventData,
            source: "data-memory-architect",
            timestamp: Date.now(),
        },
    });

    await supabase.removeChannel(channel);
}

// Usage
await broadcastEventToAgents("projection-rebuilt", {
    projection: "user-preferences",
    recordCount: 1542,
    duration_ms: 320,
});
```

---

## 3. Presence

Presence synchronizes shared state across all clients on a channel. Each client "tracks" a state
object, and all other clients receive updates when someone joins, leaves, or updates their state.

Use cases for JARVIS:
- Track which agents are online and their current status
- Monitor active memory consolidation processes
- Coordinate distributed work (e.g., "I'm processing tier 3, you take tier 4")
- Display agent activity in monitoring dashboards

### Tracking Presence

```typescript
const channel = supabase.channel("agent-presence");

// Track this agent's presence state
channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
        await channel.track({
            agent_id: "data-memory-architect",
            status: "active",
            current_task: "memory-consolidation",
            memory_tier_processing: 3,
            started_at: new Date().toISOString(),
            cpu_usage: 0.45,
        });
    }
});
```

### Updating Presence State

```typescript
// Update the tracked state (replaces the previous state for this key)
await channel.track({
    agent_id: "data-memory-architect",
    status: "active",
    current_task: "embedding-generation",
    memory_tier_processing: null,
    started_at: new Date().toISOString(),
    cpu_usage: 0.78,
});

// Untrack (remove this client from presence)
await channel.untrack();
```

### Listening for Presence Changes

```typescript
const channel = supabase.channel("agent-presence");

channel
    .on("presence", { event: "sync" }, () => {
        // Fires whenever the presence state is synchronized
        // presenceState() returns the full state of all tracked clients
        const state = channel.presenceState();
        console.log("All agents online:", state);
        // {
        //   "data-memory-architect": [{ agent_id: "data-memory-architect", status: "active", ... }],
        //   "orchestrator": [{ agent_id: "orchestrator", status: "idle", ... }],
        // }
    })
    .on("presence", { event: "join" }, ({ key, newPresences }) => {
        // Fires when a new client joins
        console.log(`Agent joined: ${key}`, newPresences);
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        // Fires when a client leaves (disconnects or untracks)
        console.log(`Agent left: ${key}`, leftPresences);
    })
    .subscribe();
```

### Presence State Structure

```typescript
// presenceState() returns a Record<string, PresenceState[]>
// The key is the presence key configured when creating the channel
// The value is an array (one entry per connection with that key)

interface AgentPresence {
    agent_id: string;
    status: "active" | "idle" | "error" | "shutting_down";
    current_task: string | null;
    memory_tier_processing: number | null;
    started_at: string;
    cpu_usage: number;
}

function getOnlineAgents(): AgentPresence[] {
    const state = channel.presenceState<AgentPresence>();
    return Object.values(state).flat();
}

function isAgentOnline(agentId: string): boolean {
    const state = channel.presenceState<AgentPresence>();
    return agentId in state;
}
```

---

## 4. Postgres Changes

Postgres Changes lets you subscribe to real-time INSERT, UPDATE, and DELETE events on your database
tables. Under the hood, Supabase uses Postgres logical replication (the `wal2json` plugin) to
capture changes and broadcast them over WebSocket channels.

This is the most powerful Realtime feature for the JARVIS memory system -- it enables reactive
projections, real-time event processing, and live read model updates.

### Prerequisites

1. **Enable Realtime on the table** (via Supabase Dashboard or SQL):

```sql
-- Enable Realtime for the events table
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- Enable Realtime for the memories table
ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;

-- Check which tables have Realtime enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

2. **Replica Identity**: For UPDATE and DELETE to include old row data, set replica identity:

```sql
-- FULL: sends the complete old row on UPDATE/DELETE (recommended for event sourcing)
ALTER TABLE public.events REPLICA IDENTITY FULL;

-- DEFAULT: only sends the primary key on UPDATE/DELETE (less data, faster)
ALTER TABLE public.memories REPLICA IDENTITY DEFAULT;
```

### Subscribing to All Changes on a Table

```typescript
const channel = supabase.channel("event-store-changes");

channel
    .on(
        "postgres_changes",
        {
            event: "*",              // INSERT, UPDATE, DELETE, or * for all
            schema: "public",
            table: "events",
        },
        (payload) => {
            console.log("Change type:", payload.eventType);  // INSERT, UPDATE, or DELETE
            console.log("New record:", payload.new);          // The new row (null on DELETE)
            console.log("Old record:", payload.old);          // The old row (requires REPLICA IDENTITY FULL)
            console.log("Commit timestamp:", payload.commit_timestamp);
        }
    )
    .subscribe();
```

### Subscribing to Specific Operations

```typescript
const channel = supabase.channel("memory-changes");

// Listen only for new memories (INSERT)
channel
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "memories",
        },
        (payload) => {
            const newMemory = payload.new;
            console.log("New memory created:", newMemory.id, newMemory.memory_type);
            // Trigger downstream processing (e.g., update read models)
        }
    )
    // Listen only for updated memories (UPDATE)
    .on(
        "postgres_changes",
        {
            event: "UPDATE",
            schema: "public",
            table: "memories",
        },
        (payload) => {
            console.log("Memory updated:", payload.new.id);
            console.log("Old values:", payload.old);
            console.log("New values:", payload.new);
        }
    )
    // Listen for deleted memories (DELETE)
    .on(
        "postgres_changes",
        {
            event: "DELETE",
            schema: "public",
            table: "memories",
        },
        (payload) => {
            console.log("Memory deleted:", payload.old.id);
        }
    )
    .subscribe();
```

### Filtering Changes with Column Conditions

```typescript
// Only receive events for a specific stream
const channel = supabase.channel("user-events");

channel
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "events",
            filter: "stream_type=eq.user-interaction",  // PostgREST filter syntax
        },
        (payload) => {
            console.log("New user interaction event:", payload.new);
        }
    )
    .subscribe();

// Filter by multiple conditions
channel
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "memories",
            filter: "memory_tier=eq.1",  // Only tier-1 (working memory)
        },
        (payload) => {
            console.log("New working memory:", payload.new);
        }
    )
    .subscribe();
```

### Supported Filter Operators

| Operator | Example | Description |
|---|---|---|
| `eq` | `filter: "memory_tier=eq.3"` | Equals |
| `neq` | `filter: "status=neq.deleted"` | Not equals |
| `lt` | `filter: "importance=lt.0.5"` | Less than |
| `lte` | `filter: "importance=lte.0.5"` | Less than or equal |
| `gt` | `filter: "importance=gt.0.8"` | Greater than |
| `gte` | `filter: "importance=gte.0.8"` | Greater than or equal |
| `in` | `filter: "memory_type=in.(episodic,semantic)"` | In list |

---

## 5. Complete Reactive Pipeline Example

This example shows how to build a reactive event processing pipeline for JARVIS using all three
Realtime features together:

```typescript
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

// -- Types --
interface JarvisEvent {
    id: string;
    stream_id: string;
    stream_type: string;
    event_type: string;
    version: number;
    payload: Record<string, unknown>;
    metadata: Record<string, unknown>;
    created_at: string;
}

interface AgentStatus {
    agent_id: string;
    status: "active" | "idle" | "processing" | "error";
    current_task: string | null;
    last_heartbeat: string;
}

// -- Setup --
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// -- Channel 1: Event Store Changes (Postgres Changes) --
// React to new events being appended to the event store
const eventStoreChannel = supabase.channel("event-store-pipeline");

eventStoreChannel
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "events",
        },
        async (payload) => {
            const event = payload.new as JarvisEvent;
            console.log(`[EventStore] New event: ${event.event_type} v${event.version}`);

            // Route event to appropriate projection handler
            switch (event.stream_type) {
                case "memory":
                    await updateMemoryProjection(event);
                    break;
                case "conversation":
                    await updateConversationProjection(event);
                    break;
                case "emotional-state":
                    await updateEmotionalProjection(event);
                    break;
            }

            // Notify other agents about the new event via broadcast
            await notificationChannel.send({
                type: "broadcast",
                event: "event-processed",
                payload: {
                    event_id: event.id,
                    event_type: event.event_type,
                    stream_type: event.stream_type,
                    processed_by: "data-memory-architect",
                },
            });
        }
    )
    .subscribe();

// -- Channel 2: Agent Notifications (Broadcast) --
const notificationChannel = supabase.channel("agent-notifications", {
    config: { broadcast: { ack: true } },
});

notificationChannel
    .on("broadcast", { event: "memory-query" }, async (payload) => {
        // Another agent is requesting a memory search
        const { query_embedding, filters, reply_channel } = payload.payload;
        const results = await searchMemories(query_embedding, filters);

        // Reply via broadcast on the specified channel
        const replyChannel = supabase.channel(reply_channel);
        replyChannel.subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
                await replyChannel.send({
                    type: "broadcast",
                    event: "memory-results",
                    payload: { results },
                });
                await supabase.removeChannel(replyChannel);
            }
        });
    })
    .subscribe();

// -- Channel 3: Agent Presence --
const presenceChannel = supabase.channel("jarvis-agents");

presenceChannel
    .on("presence", { event: "sync" }, () => {
        const agents = presenceChannel.presenceState<AgentStatus>();
        const onlineCount = Object.keys(agents).length;
        console.log(`[Presence] ${onlineCount} agents online`);
    })
    .on("presence", { event: "leave" }, ({ key }) => {
        console.log(`[Presence] Agent ${key} went offline`);
    })
    .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
            await presenceChannel.track({
                agent_id: "data-memory-architect",
                status: "active",
                current_task: "event-processing",
                last_heartbeat: new Date().toISOString(),
            });

            // Update heartbeat every 30 seconds
            setInterval(async () => {
                await presenceChannel.track({
                    agent_id: "data-memory-architect",
                    status: "active",
                    current_task: "event-processing",
                    last_heartbeat: new Date().toISOString(),
                });
            }, 30000);
        }
    });

// -- Projection Handlers --
async function updateMemoryProjection(event: JarvisEvent): Promise<void> {
    switch (event.event_type) {
        case "MemoryCreated":
            await supabase.from("memory_read_model").insert({
                memory_id: event.payload.memory_id,
                content: event.payload.content,
                tier: event.payload.tier,
                version: event.version,
            });
            break;
        case "MemoryPromoted":
            await supabase
                .from("memory_read_model")
                .update({ tier: event.payload.new_tier, version: event.version })
                .eq("memory_id", event.payload.memory_id);
            break;
        case "MemoryExpired":
            await supabase
                .from("memory_read_model")
                .update({ status: "expired", version: event.version })
                .eq("memory_id", event.payload.memory_id);
            break;
    }
}

async function updateConversationProjection(event: JarvisEvent): Promise<void> {
    // ... projection logic for conversation events
}

async function updateEmotionalProjection(event: JarvisEvent): Promise<void> {
    // ... projection logic for emotional state events
}

async function searchMemories(
    queryEmbedding: number[],
    filters: Record<string, unknown>
): Promise<unknown[]> {
    const { data } = await supabase.rpc("search_memories", {
        query_embedding: queryEmbedding,
        match_threshold: (filters.threshold as number) ?? 0.7,
        match_count: (filters.limit as number) ?? 10,
        filter_tier: (filters.tier as number) ?? null,
    });
    return data ?? [];
}
```

---

## 6. Configuration and Limits

### Rate Limits (Supabase Free Tier)

| Feature | Limit |
|---|---|
| Concurrent connections | 200 |
| Messages per second (broadcast) | 100 per channel |
| Presence updates per second | 10 per client |
| Postgres Changes throughput | ~100 changes/sec per table |
| Channel joins per second | 100 |

### Performance Considerations

1. **Postgres Changes are per-table, not per-row.** Use `filter` to reduce traffic.
2. **Broadcast is fire-and-forget** by default. Enable `ack: true` if delivery matters.
3. **Presence state is replicated to all clients.** Keep tracked objects small.
4. **Reconnection is automatic** in `supabase-js`, but you should re-subscribe on CHANNEL_ERROR.
5. **Large payloads** should be stored in the database; broadcast only the reference/ID.

### Enabling Realtime via SQL

```sql
-- Add a table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emotional_states;

-- Remove a table from realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.some_table;

-- Check which tables are enabled
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

---

## 7. Error Handling and Reconnection

```typescript
// Robust channel subscription with error handling
function subscribeWithRetry(
    channel: RealtimeChannel,
    maxRetries: number = 5
): void {
    let retryCount = 0;

    channel.subscribe((status, err) => {
        switch (status) {
            case "SUBSCRIBED":
                retryCount = 0;
                console.log("[Realtime] Subscribed successfully");
                break;
            case "CHANNEL_ERROR":
                console.error("[Realtime] Channel error:", err);
                if (retryCount < maxRetries) {
                    retryCount++;
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
                    console.log(`[Realtime] Retrying in ${delay}ms (attempt ${retryCount})`);
                    setTimeout(() => channel.subscribe(), delay);
                }
                break;
            case "TIMED_OUT":
                console.warn("[Realtime] Subscription timed out");
                break;
            case "CLOSED":
                console.log("[Realtime] Channel closed");
                break;
        }
    });
}
```

---

## Summary: Realtime Decisions for JARVIS Memory System

1. **Postgres Changes** on the `events` table drives projection rebuilds reactively.
2. **Broadcast** on `agent-notifications` channel handles agent-to-agent signaling.
3. **Presence** on `jarvis-agents` channel tracks which agents are online and their status.
4. **Filters** on Postgres Changes reduce noise (e.g., only listen for specific `stream_type`).
5. **Replica Identity FULL** on the events table ensures complete row data on UPDATE/DELETE.
6. **Heartbeat** via Presence track updates every 30 seconds for liveness monitoring.
7. **Ack mode** enabled for critical broadcast messages; disabled for high-frequency signals.
