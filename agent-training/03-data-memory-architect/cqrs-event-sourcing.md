---
archetypes: [meridian, jon]
skills: [data-memory, historical-narrative, pattern-documentation]
training_cluster: 03-data-memory-architect
domain: architecture
difficulty: advanced
version: 1.0
---
# CQRS and Event Sourcing: Architecture Patterns for the JARVIS Memory System

## Overview

**CQRS** (Command Query Responsibility Segregation) and **Event Sourcing** (ES) are complementary
architectural patterns that separate how data is written from how it is read, and persist state as
an immutable sequence of events rather than mutable current state. Together they form the backbone
of the JARVIS six-tier memory system.

- **CQRS**: Separate the write model (commands) from the read model (queries). Each side can be
  independently optimized, scaled, and evolved.
- **Event Sourcing**: Instead of storing the current state, store every state change as an
  immutable event. Current state is derived by replaying events.

---

## 1. Architecture Overview

```
                           CQRS + Event Sourcing Architecture
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 │   WRITE SIDE (Commands)                  READ SIDE (Queries)                 │
 │   ━━━━━━━━━━━━━━━━━━━━━                 ━━━━━━━━━━━━━━━━━━━                 │
 │                                                                              │
 │   ┌─────────────┐                       ┌─────────────────┐                 │
 │   │   Client /   │                       │   Client /       │                │
 │   │   Agent      │                       │   Agent          │                │
 │   └──────┬───────┘                       └───────┬──────────┘                │
 │          │ Command                               │ Query                     │
 │          ▼                                       ▼                           │
 │   ┌──────────────┐                       ┌─────────────────┐                │
 │   │  Command     │                       │  Query           │                │
 │   │  Handler     │                       │  Handler         │                │
 │   └──────┬───────┘                       └───────┬──────────┘                │
 │          │                                       │                           │
 │          ▼                                       ▼                           │
 │   ┌──────────────┐                       ┌─────────────────┐                │
 │   │  Aggregate   │                       │  Read Model      │◄──┐           │
 │   │  (Domain     │                       │  (Optimized for  │   │           │
 │   │   Logic)     │                       │   queries)       │   │           │
 │   └──────┬───────┘                       └──────────────────┘   │           │
 │          │ Events                                               │           │
 │          ▼                                                      │           │
 │   ┌──────────────┐         ┌──────────────┐                    │           │
 │   │  Event       │────────►│  Projection  │────────────────────┘           │
 │   │  Store       │         │  Engine      │                                 │
 │   │  (append     │         │  (builds     │                                 │
 │   │   only)      │         │   read       │                                 │
 │   └──────────────┘         │   models)    │                                 │
 │                            └──────────────┘                                 │
 │                                                                              │
 └──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Command Query Responsibility Segregation (CQRS)

### The Problem CQRS Solves

In traditional architectures, the same data model serves both writes and reads. This creates tension:

- **Writes** need validation, business rules, consistency guarantees
- **Reads** need fast queries, denormalized data, multiple view shapes
- Optimizing for one degrades the other

### Core Principle

**Separate the write model from the read model.** They can use different:
- Data stores (Postgres for writes, materialized views for reads)
- Schemas (normalized events vs. denormalized projections)
- Scaling strategies (writes are sequential; reads can be parallelized)
- APIs (command handlers vs. query handlers)

### Commands

Commands represent the intent to change state. They are imperative: "do this."

```typescript
// Command types for the JARVIS memory system
interface Command {
    type: string;
    timestamp: string;
    issued_by: string;   // which agent issued the command
    correlation_id: string;
}

interface CreateMemoryCommand extends Command {
    type: "CreateMemory";
    stream_id: string;
    content: string;
    memory_type: "episodic" | "semantic" | "procedural" | "emotional";
    tier: number;
    embedding: number[];
    metadata: Record<string, unknown>;
}

interface PromoteMemoryCommand extends Command {
    type: "PromoteMemory";
    stream_id: string;
    from_tier: number;
    to_tier: number;
    reason: string;
}

interface ConsolidateMemoriesCommand extends Command {
    type: "ConsolidateMemories";
    source_memory_ids: string[];
    target_tier: number;
    consolidation_strategy: "merge" | "summarize" | "abstract";
}

interface ForgetMemoryCommand extends Command {
    type: "ForgetMemory";
    stream_id: string;
    reason: "expired" | "irrelevant" | "superseded" | "user_request";
}
```

### Command Handlers

Command handlers validate the command, load the aggregate, execute business logic, and persist
resulting events.

```typescript
class MemoryCommandHandler {
    constructor(
        private eventStore: EventStore,
        private embeddingService: EmbeddingService
    ) {}

    async handle(command: Command): Promise<void> {
        switch (command.type) {
            case "CreateMemory":
                return this.handleCreateMemory(command as CreateMemoryCommand);
            case "PromoteMemory":
                return this.handlePromoteMemory(command as PromoteMemoryCommand);
            case "ConsolidateMemories":
                return this.handleConsolidate(command as ConsolidateMemoriesCommand);
            case "ForgetMemory":
                return this.handleForget(command as ForgetMemoryCommand);
            default:
                throw new Error(`Unknown command: ${command.type}`);
        }
    }

    private async handleCreateMemory(cmd: CreateMemoryCommand): Promise<void> {
        // Validation
        if (!cmd.content || cmd.content.trim().length === 0) {
            throw new Error("Memory content cannot be empty");
        }
        if (cmd.tier < 1 || cmd.tier > 6) {
            throw new Error("Memory tier must be between 1 and 6");
        }

        // Check for duplicate content (semantic deduplication)
        const duplicates = await this.embeddingService.findSimilar(cmd.embedding, 0.95);
        if (duplicates.length > 0) {
            throw new Error(`Duplicate memory detected: ${duplicates[0].id}`);
        }

        // Create event
        const event: MemoryCreatedEvent = {
            type: "MemoryCreated",
            stream_id: cmd.stream_id,
            stream_type: "memory",
            payload: {
                content: cmd.content,
                memory_type: cmd.memory_type,
                tier: cmd.tier,
                embedding: cmd.embedding,
                metadata: cmd.metadata,
            },
            metadata: {
                correlation_id: cmd.correlation_id,
                issued_by: cmd.issued_by,
                timestamp: cmd.timestamp,
            },
        };

        // Append to event store (with optimistic concurrency)
        await this.eventStore.append(event, 0);  // expected version = 0 for new stream
    }

    private async handlePromoteMemory(cmd: PromoteMemoryCommand): Promise<void> {
        // Load the aggregate from events
        const aggregate = await this.loadMemoryAggregate(cmd.stream_id);

        // Business rule validation
        if (aggregate.currentTier !== cmd.from_tier) {
            throw new Error(
                `Memory is at tier ${aggregate.currentTier}, not ${cmd.from_tier}`
            );
        }
        if (cmd.to_tier <= cmd.from_tier) {
            throw new Error("Can only promote to a higher tier");
        }

        const event: MemoryPromotedEvent = {
            type: "MemoryPromoted",
            stream_id: cmd.stream_id,
            stream_type: "memory",
            payload: {
                from_tier: cmd.from_tier,
                to_tier: cmd.to_tier,
                reason: cmd.reason,
            },
            metadata: {
                correlation_id: cmd.correlation_id,
                issued_by: cmd.issued_by,
            },
        };

        await this.eventStore.append(event, aggregate.version);
    }

    private async loadMemoryAggregate(streamId: string): Promise<MemoryAggregate> {
        const events = await this.eventStore.getStream(streamId);
        return MemoryAggregate.rehydrate(events);
    }

    // ... other handlers
}
```

### Queries

Queries read from optimized read models (projections), never from the event store directly.

```typescript
// Query types
interface SearchMemoriesQuery {
    type: "SearchMemories";
    embedding: number[];
    tier?: number;
    memory_type?: string;
    min_similarity: number;
    limit: number;
}

interface GetMemoryTimelineQuery {
    type: "GetMemoryTimeline";
    stream_id: string;
}

interface GetEmotionalStateQuery {
    type: "GetEmotionalState";
    agent_id: string;
    from: string;
    to: string;
}

// Query handler reads from optimized read models
class MemoryQueryHandler {
    constructor(private supabase: SupabaseClient) {}

    async searchMemories(query: SearchMemoriesQuery) {
        // Reads from the optimized read model, NOT the event store
        const { data } = await this.supabase.rpc("search_memories", {
            query_embedding: query.embedding,
            match_threshold: query.min_similarity,
            match_count: query.limit,
            filter_tier: query.tier ?? null,
            filter_type: query.memory_type ?? null,
        });
        return data;
    }

    async getTimeline(query: GetMemoryTimelineQuery) {
        // Read from the timeline read model
        const { data } = await this.supabase
            .from("memory_timeline_view")
            .select("*")
            .eq("stream_id", query.stream_id)
            .order("version", { ascending: true });
        return data;
    }
}
```

---

## 3. Event Sourcing

### The Problem Event Sourcing Solves

Traditional databases store current state and overwrite previous values. This loses:
- **History**: What happened and when
- **Audit trail**: Who changed what
- **Debugging**: Why the system is in its current state
- **Flexibility**: The ability to derive new views from historical data

### Core Principle

**Store every state change as an immutable, append-only event.** Current state is derived by
replaying events from the beginning (or from a snapshot).

```
Traditional:  UPDATE users SET name = 'Bob' WHERE id = 1;
              -- Previous name is LOST

Event Sourced: INSERT INTO events VALUES ('UserRenamed', {old: 'Alice', new: 'Bob'});
               -- Complete history is PRESERVED
```

### Event Structure

```typescript
interface DomainEvent {
    // Identity
    id: string;              // Unique event ID (UUID)
    stream_id: string;       // Aggregate/entity ID this event belongs to
    stream_type: string;     // Type of aggregate (memory, conversation, etc.)
    event_type: string;      // What happened (MemoryCreated, MemoryPromoted, etc.)
    version: number;         // Sequential version within the stream

    // Data
    payload: Record<string, unknown>;   // Event-specific data
    metadata: Record<string, unknown>;  // Correlation IDs, causation, agent info

    // Timestamp
    created_at: string;      // When the event occurred
}
```

### Event Types for JARVIS Memory System

```typescript
// Memory lifecycle events
type MemoryEvent =
    | { type: "MemoryCreated"; payload: {
        content: string;
        memory_type: string;
        tier: number;
        embedding: number[];
        importance: number;
    }}
    | { type: "MemoryAccessed"; payload: {
        accessed_by: string;
        context: string;
        relevance_score: number;
    }}
    | { type: "MemoryPromoted"; payload: {
        from_tier: number;
        to_tier: number;
        reason: string;
    }}
    | { type: "MemoryDemoted"; payload: {
        from_tier: number;
        to_tier: number;
        reason: string;
    }}
    | { type: "MemoryConsolidated"; payload: {
        source_memory_ids: string[];
        consolidated_content: string;
        new_embedding: number[];
        strategy: string;
    }}
    | { type: "MemoryExpired"; payload: {
        reason: string;
        final_tier: number;
        total_accesses: number;
        lifespan_hours: number;
    }}
    | { type: "MemoryEmotionTagged"; payload: {
        emotion: string;
        intensity: number;
        context_event_id: string;
    }}
    | { type: "ImportanceRecalculated"; payload: {
        old_importance: number;
        new_importance: number;
        factors: Record<string, number>;
    }};
```

---

## 4. Event Store Implementation in Postgres

### Schema

```sql
-- The event store table
CREATE TABLE public.event_store (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id       TEXT NOT NULL,
    stream_type     TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    version         BIGINT NOT NULL,
    payload         JSONB NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ensure ordering within a stream
    UNIQUE (stream_id, version)
);

-- Indexes for common access patterns
CREATE INDEX idx_es_stream ON public.event_store (stream_id, version ASC);
CREATE INDEX idx_es_type ON public.event_store (event_type);
CREATE INDEX idx_es_created ON public.event_store (created_at);
CREATE INDEX idx_es_stream_type ON public.event_store (stream_type, created_at);

-- Global ordering index (for projections that process all events)
CREATE INDEX idx_es_global_order ON public.event_store (created_at, id);
```

### Append Function with Optimistic Concurrency

```sql
CREATE OR REPLACE FUNCTION public.append_event(
    p_stream_id     TEXT,
    p_stream_type   TEXT,
    p_event_type    TEXT,
    p_expected_ver  BIGINT,
    p_payload       JSONB,
    p_metadata      JSONB DEFAULT '{}'
)
RETURNS public.event_store
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_version BIGINT;
    v_new_event       public.event_store;
BEGIN
    -- Lock the stream to prevent concurrent writes
    PERFORM pg_advisory_xact_lock(hashtext(p_stream_id));

    -- Get current version
    SELECT COALESCE(MAX(version), 0)
    INTO v_current_version
    FROM public.event_store
    WHERE stream_id = p_stream_id;

    -- Optimistic concurrency check
    IF v_current_version != p_expected_ver THEN
        RAISE EXCEPTION 'ConcurrencyError: stream=% expected_version=% actual_version=%',
            p_stream_id, p_expected_ver, v_current_version
        USING ERRCODE = 'serialization_failure';
    END IF;

    -- Append the event
    INSERT INTO public.event_store
        (stream_id, stream_type, event_type, version, payload, metadata)
    VALUES
        (p_stream_id, p_stream_type, p_event_type, v_current_version + 1, p_payload, p_metadata)
    RETURNING * INTO v_new_event;

    -- Notify listeners (Supabase Realtime will also pick this up)
    PERFORM pg_notify('events', json_build_object(
        'id', v_new_event.id,
        'stream_id', v_new_event.stream_id,
        'event_type', v_new_event.event_type,
        'version', v_new_event.version
    )::text);

    RETURN v_new_event;
END;
$$;
```

### Reading a Stream

```sql
-- Get all events for a stream (to rebuild aggregate state)
CREATE OR REPLACE FUNCTION public.get_stream(
    p_stream_id TEXT,
    p_from_version BIGINT DEFAULT 0
)
RETURNS SETOF public.event_store
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT *
    FROM public.event_store
    WHERE stream_id = p_stream_id
      AND version > p_from_version
    ORDER BY version ASC;
$$;

-- Get all events of a given type (for projections)
CREATE OR REPLACE FUNCTION public.get_events_by_type(
    p_event_type TEXT,
    p_since TIMESTAMPTZ DEFAULT '-infinity'::timestamptz,
    p_limit INTEGER DEFAULT 1000
)
RETURNS SETOF public.event_store
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT *
    FROM public.event_store
    WHERE event_type = p_event_type
      AND created_at > p_since
    ORDER BY created_at ASC, id ASC
    LIMIT p_limit;
$$;
```

---

## 5. Aggregates

An aggregate is a domain object whose state is derived by replaying its events. It enforces business
rules and emits new events.

```typescript
class MemoryAggregate {
    // Current state (derived from events)
    public id: string = "";
    public content: string = "";
    public memoryType: string = "";
    public currentTier: number = 0;
    public importance: number = 0;
    public accessCount: number = 0;
    public isExpired: boolean = false;
    public version: number = 0;
    public emotions: Array<{ emotion: string; intensity: number }> = [];

    // Rehydrate from events
    static rehydrate(events: DomainEvent[]): MemoryAggregate {
        const aggregate = new MemoryAggregate();
        for (const event of events) {
            aggregate.apply(event);
        }
        return aggregate;
    }

    private apply(event: DomainEvent): void {
        this.version = event.version;

        switch (event.event_type) {
            case "MemoryCreated":
                this.id = event.stream_id;
                this.content = event.payload.content as string;
                this.memoryType = event.payload.memory_type as string;
                this.currentTier = event.payload.tier as number;
                this.importance = event.payload.importance as number;
                break;

            case "MemoryAccessed":
                this.accessCount += 1;
                break;

            case "MemoryPromoted":
                this.currentTier = event.payload.to_tier as number;
                break;

            case "MemoryDemoted":
                this.currentTier = event.payload.to_tier as number;
                break;

            case "MemoryConsolidated":
                this.content = event.payload.consolidated_content as string;
                break;

            case "MemoryExpired":
                this.isExpired = true;
                break;

            case "MemoryEmotionTagged":
                this.emotions.push({
                    emotion: event.payload.emotion as string,
                    intensity: event.payload.intensity as number,
                });
                break;

            case "ImportanceRecalculated":
                this.importance = event.payload.new_importance as number;
                break;
        }
    }
}
```

---

## 6. Projections (Read Models)

Projections consume events and build optimized read models. They run asynchronously and can be
rebuilt from scratch at any time by replaying all events.

```
                          Projection Architecture
 ┌───────────────┐
 │  Event Store  │
 │  (append-only │──────┬──────────┬──────────┬──────────────┐
 │   log)        │      │          │          │              │
 └───────────────┘      ▼          ▼          ▼              ▼
              ┌──────────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
              │  Memory      │ │Timeline│ │Emotional │ │ Search   │
              │  Summary     │ │  View  │ │  State   │ │  Index   │
              │  Projection  │ │  Proj. │ │  Proj.   │ │  Proj.   │
              └──────┬───────┘ └───┬────┘ └────┬─────┘ └────┬─────┘
                     │             │            │            │
                     ▼             ▼            ▼            ▼
              ┌──────────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
              │ memories     │ │timeline│ │emotional │ │ vector   │
              │ _read_model  │ │_events │ │_states   │ │ _index   │
              │ (table)      │ │(table) │ │(table)   │ │ (pgvec)  │
              └──────────────┘ └────────┘ └──────────┘ └──────────┘
```

### Projection Implementation

```typescript
// Base projection interface
interface Projection {
    name: string;
    handleEvent(event: DomainEvent): Promise<void>;
    rebuild(): Promise<void>;
    getCheckpoint(): Promise<string>;  // Last processed event timestamp
}

// Memory summary projection
class MemorySummaryProjection implements Projection {
    name = "memory-summary";

    constructor(private supabase: SupabaseClient) {}

    async handleEvent(event: DomainEvent): Promise<void> {
        switch (event.event_type) {
            case "MemoryCreated":
                await this.supabase.from("memory_read_model").insert({
                    id: event.stream_id,
                    content: event.payload.content,
                    memory_type: event.payload.memory_type,
                    tier: event.payload.tier,
                    importance: event.payload.importance,
                    access_count: 0,
                    is_active: true,
                    version: event.version,
                    created_at: event.created_at,
                    last_event_at: event.created_at,
                });
                break;

            case "MemoryPromoted":
                await this.supabase
                    .from("memory_read_model")
                    .update({
                        tier: event.payload.to_tier,
                        version: event.version,
                        last_event_at: event.created_at,
                    })
                    .eq("id", event.stream_id);
                break;

            case "MemoryAccessed":
                await this.supabase.rpc("increment_access_count", {
                    p_memory_id: event.stream_id,
                    p_version: event.version,
                    p_timestamp: event.created_at,
                });
                break;

            case "MemoryExpired":
                await this.supabase
                    .from("memory_read_model")
                    .update({
                        is_active: false,
                        version: event.version,
                        last_event_at: event.created_at,
                    })
                    .eq("id", event.stream_id);
                break;
        }

        // Update checkpoint
        await this.supabase
            .from("projection_checkpoints")
            .upsert({
                projection_name: this.name,
                last_event_at: event.created_at,
                last_event_id: event.id,
                updated_at: new Date().toISOString(),
            });
    }

    async rebuild(): Promise<void> {
        // Truncate the read model
        await this.supabase.rpc("truncate_memory_read_model");

        // Replay all events from the beginning
        let cursor = "";
        let batch: DomainEvent[];

        do {
            const { data } = await this.supabase
                .from("event_store")
                .select("*")
                .in("stream_type", ["memory"])
                .gt("created_at", cursor)
                .order("created_at", { ascending: true })
                .order("id", { ascending: true })
                .limit(500);

            batch = data ?? [];

            for (const event of batch) {
                await this.handleEvent(event as DomainEvent);
            }

            if (batch.length > 0) {
                cursor = batch[batch.length - 1].created_at;
            }
        } while (batch.length === 500);
    }

    async getCheckpoint(): Promise<string> {
        const { data } = await this.supabase
            .from("projection_checkpoints")
            .select("last_event_at")
            .eq("projection_name", this.name)
            .single();
        return data?.last_event_at ?? "";
    }
}
```

### Projection Checkpoints Table

```sql
CREATE TABLE public.projection_checkpoints (
    projection_name TEXT PRIMARY KEY,
    last_event_id   UUID,
    last_event_at   TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7. Snapshots

For streams with many events, replaying from the beginning is expensive. Snapshots save the
aggregate state at a point in time so you only replay events after the snapshot.

```sql
-- Snapshots table
CREATE TABLE public.snapshots (
    stream_id       TEXT NOT NULL,
    stream_type     TEXT NOT NULL,
    version         BIGINT NOT NULL,
    state           JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (stream_id, version)
);

-- Index for fast lookup
CREATE INDEX idx_snapshots_stream ON public.snapshots (stream_id, version DESC);
```

### Creating Snapshots

```typescript
class SnapshotStore {
    constructor(private supabase: SupabaseClient) {}

    async saveSnapshot(
        streamId: string,
        streamType: string,
        version: number,
        state: Record<string, unknown>
    ): Promise<void> {
        await this.supabase.from("snapshots").insert({
            stream_id: streamId,
            stream_type: streamType,
            version: version,
            state: state,
        });
    }

    async getLatestSnapshot(streamId: string): Promise<{
        version: number;
        state: Record<string, unknown>;
    } | null> {
        const { data } = await this.supabase
            .from("snapshots")
            .select("version, state")
            .eq("stream_id", streamId)
            .order("version", { ascending: false })
            .limit(1)
            .single();

        return data;
    }
}

// Loading an aggregate with snapshot optimization
async function loadAggregate(streamId: string): Promise<MemoryAggregate> {
    const snapshotStore = new SnapshotStore(supabase);
    const eventStore = new EventStore(supabase);

    // Try to load from snapshot
    const snapshot = await snapshotStore.getLatestSnapshot(streamId);

    let aggregate: MemoryAggregate;
    let fromVersion: number;

    if (snapshot) {
        // Rehydrate from snapshot state
        aggregate = MemoryAggregate.fromSnapshot(snapshot.state);
        fromVersion = snapshot.version;
    } else {
        aggregate = new MemoryAggregate();
        fromVersion = 0;
    }

    // Replay only events AFTER the snapshot
    const events = await eventStore.getStream(streamId, fromVersion);
    for (const event of events) {
        aggregate.apply(event);
    }

    // Take a new snapshot every 100 events
    if (aggregate.version - fromVersion > 100) {
        await snapshotStore.saveSnapshot(
            streamId,
            "memory",
            aggregate.version,
            aggregate.toSnapshot()
        );
    }

    return aggregate;
}
```

---

## 8. Eventual Consistency

CQRS+ES introduces eventual consistency between the write side and read side. Events are appended
immediately, but projections may lag behind.

```
Timeline:
  t=0   Command received
  t=1   Event appended to event store        ← Write is consistent
  t=5   Projection processes event            ← Read model updated (eventual)
  t=5   Read model reflects new state
```

### Strategies for Handling Eventual Consistency

1. **Optimistic UI**: Return the command result immediately, update UI optimistically.
2. **Read-your-writes**: After a command, poll the read model until it catches up.
3. **Versioned reads**: Include the expected version in queries; retry if stale.
4. **Synchronous projections**: For critical read models, update inline with the write.

```typescript
// Strategy: Read-your-writes with version check
async function createAndWaitForMemory(
    command: CreateMemoryCommand,
    timeoutMs: number = 5000
): Promise<MemoryReadModel> {
    // Execute the command (returns the new version)
    const event = await commandHandler.handle(command);

    // Poll the read model until it catches up
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const { data } = await supabase
            .from("memory_read_model")
            .select("*")
            .eq("id", command.stream_id)
            .gte("version", event.version)
            .single();

        if (data) return data;
        await new Promise((r) => setTimeout(r, 100));
    }

    throw new Error("Read model did not catch up within timeout");
}
```

---

## 9. When to Use CQRS + Event Sourcing

### Good Fit (use for JARVIS)

- **Audit trail required**: Every memory change must be traceable
- **Complex domain logic**: Memory promotion, consolidation, emotional tagging
- **Multiple read models**: Different views of the same data (search, timeline, analytics)
- **Temporal queries**: "What did the agent know at time T?"
- **Event-driven architecture**: Agents react to events, not state changes
- **Rebuild capability**: Ability to create new projections from historical events

### Bad Fit (avoid for these)

- Simple CRUD with no history requirements
- High-frequency writes with immediate consistency needs (e.g., counters)
- Simple applications with a single read pattern

---

## 10. Six-Tier Memory System Event Flow

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                    JARVIS Memory Tiers                          │
 │                                                                 │
 │  Tier 1: Working Memory     (seconds)    ← Volatile, in-RAM    │
 │  Tier 2: Short-Term Memory  (minutes)    ← Event-sourced       │
 │  Tier 3: Session Memory     (hours)      ← Event-sourced       │
 │  Tier 4: Long-Term Memory   (days-weeks) ← Event-sourced       │
 │  Tier 5: Core Memory        (permanent)  ← Event-sourced       │
 │  Tier 6: Archival Memory    (compressed) ← Snapshot + events   │
 │                                                                 │
 │  Events flow:                                                   │
 │  MemoryCreated(tier=1) → MemoryPromoted(1→2) → ... → tier=5   │
 │  Or:                                                            │
 │  MemoryCreated(tier=1) → MemoryExpired (forgotten)              │
 └─────────────────────────────────────────────────────────────────┘
```

### Promotion Rules (implemented in command handlers)

```typescript
const PROMOTION_RULES: Record<number, {
    min_accesses: number;
    min_importance: number;
    min_age_minutes: number;
}> = {
    1: { min_accesses: 2,  min_importance: 0.3, min_age_minutes: 1     },  // 1→2
    2: { min_accesses: 5,  min_importance: 0.5, min_age_minutes: 10    },  // 2→3
    3: { min_accesses: 10, min_importance: 0.6, min_age_minutes: 60    },  // 3→4
    4: { min_accesses: 20, min_importance: 0.7, min_age_minutes: 1440  },  // 4→5
    5: { min_accesses: 0,  min_importance: 0.0, min_age_minutes: 10080 },  // 5→6 (archival)
};
```

---

## Summary: CQRS+ES Decisions for JARVIS

1. **Event store** is the single source of truth for all memory state changes.
2. **Commands** validate and enforce business rules before emitting events.
3. **Projections** build optimized read models (search index, timeline, analytics).
4. **Snapshots** taken every 100 events per stream for fast aggregate loading.
5. **Eventual consistency** handled via read-your-writes pattern with version checks.
6. **All six memory tiers** are modeled as event streams with promotion/demotion events.
7. **Rebuild capability**: Any read model can be rebuilt by replaying the event store.
8. **Postgres** serves as both event store and read model store (different tables).
