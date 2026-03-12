---
archetypes: [meridian, jarvis]
skills: [data-memory, infrastructure]
training_cluster: 03-data-memory-architect
domain: data
difficulty: intermediate
version: 1.0
---
# Supabase Postgres: Comprehensive Guide for the Data/Memory Architect

## Overview

Supabase provides a full, dedicated Postgres database instance for every project. This is not a
proprietary abstraction -- it is standard PostgreSQL (version 15+) with a curated set of extensions,
a built-in connection pooler (PgBouncer / Supavisor), auto-generated REST and GraphQL APIs, and
Row Level Security (RLS) as the primary authorization mechanism. Every feature of Postgres is
available: triggers, functions, views, materialized views, CTEs, window functions, partitioning,
foreign data wrappers, and more.

As the Data/Memory Architect for JARVIS, Postgres is the foundational storage layer for the event
log, read models, embedding stores, and the six-tier memory system.

---

## 1. Core Postgres Features in Supabase

### Schemas

Supabase exposes several schemas by default:

| Schema | Purpose |
|---|---|
| `public` | Default schema exposed via the REST API (PostgREST) |
| `auth` | Managed by Supabase Auth -- users, sessions, identities |
| `storage` | Managed by Supabase Storage -- buckets and objects metadata |
| `realtime` | Internal schema for the Realtime engine |
| `extensions` | Where Supabase installs Postgres extensions |

You can create custom schemas for internal logic that should NOT be exposed via the API:

```sql
-- Create a private schema for internal JARVIS processing
CREATE SCHEMA IF NOT EXISTS jarvis_internal;

-- Grant usage to the service role but not anon
GRANT USAGE ON SCHEMA jarvis_internal TO service_role;
REVOKE ALL ON SCHEMA jarvis_internal FROM anon;
REVOKE ALL ON SCHEMA jarvis_internal FROM authenticated;
```

### Tables, Views, and Materialized Views

```sql
-- Standard table creation
CREATE TABLE public.events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id   TEXT NOT NULL,
    stream_type TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    version     BIGINT NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}',
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (stream_id, version)
);

-- Create an index for fast stream lookups
CREATE INDEX idx_events_stream ON public.events (stream_id, version);
CREATE INDEX idx_events_type ON public.events (event_type);
CREATE INDEX idx_events_created ON public.events (created_at);

-- GIN index for JSONB payload queries
CREATE INDEX idx_events_payload ON public.events USING GIN (payload jsonb_path_ops);

-- View for the latest state of each stream
CREATE VIEW public.stream_heads AS
SELECT DISTINCT ON (stream_id)
    stream_id,
    stream_type,
    version,
    payload,
    created_at
FROM public.events
ORDER BY stream_id, version DESC;

-- Materialized view for aggregated read models (refreshed on demand)
CREATE MATERIALIZED VIEW public.memory_summary AS
SELECT
    stream_type,
    COUNT(*) AS event_count,
    MAX(version) AS latest_version,
    MAX(created_at) AS last_updated
FROM public.events
GROUP BY stream_type
WITH DATA;

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY public.memory_summary;
```

### Functions and Triggers

Postgres functions (PL/pgSQL) are the backbone of server-side logic in Supabase:

```sql
-- Function to append an event with optimistic concurrency
CREATE OR REPLACE FUNCTION public.append_event(
    p_stream_id TEXT,
    p_stream_type TEXT,
    p_event_type TEXT,
    p_expected_version BIGINT,
    p_payload JSONB,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_version BIGINT;
    v_new_event public.events;
BEGIN
    -- Get the current version for this stream
    SELECT COALESCE(MAX(version), 0)
    INTO v_current_version
    FROM public.events
    WHERE stream_id = p_stream_id;

    -- Optimistic concurrency check
    IF v_current_version != p_expected_version THEN
        RAISE EXCEPTION 'Concurrency conflict: expected version %, got %',
            p_expected_version, v_current_version;
    END IF;

    -- Insert the new event
    INSERT INTO public.events (stream_id, stream_type, event_type, version, payload, metadata)
    VALUES (p_stream_id, p_stream_type, p_event_type, p_expected_version + 1, p_payload, p_metadata)
    RETURNING * INTO v_new_event;

    RETURN v_new_event;
END;
$$;

-- Trigger function to notify on new events (for Realtime / NOTIFY)
CREATE OR REPLACE FUNCTION public.notify_event_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM pg_notify(
        'new_event',
        json_build_object(
            'stream_id', NEW.stream_id,
            'event_type', NEW.event_type,
            'version', NEW.version
        )::text
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_event_notify
    AFTER INSERT ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_event_insert();
```

### Partitioning

For high-volume event logs, table partitioning is critical:

```sql
-- Range-partitioned events table by created_at
CREATE TABLE public.events_partitioned (
    id          UUID NOT NULL DEFAULT gen_random_uuid(),
    stream_id   TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    version     BIGINT NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE public.events_2025_01 PARTITION OF public.events_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE public.events_2025_02 PARTITION OF public.events_partitioned
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Indexes are created per partition automatically if defined on parent
CREATE INDEX ON public.events_partitioned (stream_id, version);
```

---

## 2. Extensions

Supabase pre-installs and supports a wide range of Postgres extensions. Enable them via SQL:

```sql
-- Enable extensions (installed in the extensions schema by default)
CREATE EXTENSION IF NOT EXISTS vector;          -- pgvector: vector similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;         -- Trigram similarity for fuzzy text search
CREATE EXTENSION IF NOT EXISTS btree_gin;       -- GIN index support for scalar types
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; -- Query performance monitoring
CREATE EXTENSION IF NOT EXISTS pgcrypto;        -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS uuid-ossp;       -- UUID generation (gen_random_uuid preferred)
CREATE EXTENSION IF NOT EXISTS pg_jsonschema;   -- JSON schema validation
CREATE EXTENSION IF NOT EXISTS pgroonga;        -- Full-text search (multilingual)
CREATE EXTENSION IF NOT EXISTS http;            -- Make HTTP requests from SQL
CREATE EXTENSION IF NOT EXISTS pg_cron;         -- Scheduled jobs inside the database
CREATE EXTENSION IF NOT EXISTS pg_net;          -- Async HTTP requests from SQL
```

### Key Extensions for JARVIS

| Extension | Use Case in JARVIS |
|---|---|
| `vector` (pgvector) | Embedding storage, semantic memory, RAG retrieval |
| `pg_trgm` | Fuzzy text matching for memory search fallback |
| `pg_cron` | Scheduled materialized view refresh, memory consolidation |
| `pg_net` | Trigger webhooks from DB events (async) |
| `pg_jsonschema` | Validate event payloads against schemas |
| `pg_stat_statements` | Monitor slow queries on read models |

### Using pg_cron for Scheduled Tasks

```sql
-- Refresh materialized views every 5 minutes
SELECT cron.schedule(
    'refresh-memory-summary',
    '*/5 * * * *',
    $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.memory_summary$$
);

-- Consolidate short-term memory into long-term every hour
SELECT cron.schedule(
    'consolidate-memory',
    '0 * * * *',
    $$SELECT jarvis_internal.consolidate_short_term_memory()$$
);

-- List all scheduled jobs
SELECT * FROM cron.job;

-- Remove a scheduled job
SELECT cron.unschedule('refresh-memory-summary');
```

---

## 3. Row Level Security (RLS)

RLS is the authorization layer in Supabase. When RLS is enabled on a table, **no rows are accessible
unless a policy explicitly grants access**. This is critical for multi-tenant or role-based systems.

### Enabling RLS

```sql
-- Enable RLS on the events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Force RLS for table owners too (otherwise superuser bypasses RLS)
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;
```

### Policy Structure

Policies follow this pattern:

```sql
CREATE POLICY "policy_name"
    ON schema.table
    FOR {ALL | SELECT | INSERT | UPDATE | DELETE}
    TO {role_name}             -- anon, authenticated, service_role
    USING (expression)         -- filter for SELECT/UPDATE/DELETE (row visibility)
    WITH CHECK (expression);   -- filter for INSERT/UPDATE (row validation)
```

### Common RLS Patterns

```sql
-- 1. Service role has full access (bypasses RLS by default, but explicit is safer)
CREATE POLICY "service_role_full_access"
    ON public.events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Authenticated users can only read events they own
CREATE POLICY "users_read_own_events"
    ON public.events
    FOR SELECT
    TO authenticated
    USING (
        metadata->>'user_id' = auth.uid()::text
    );

-- 3. Authenticated users can insert events for themselves
CREATE POLICY "users_insert_own_events"
    ON public.events
    FOR INSERT
    TO authenticated
    WITH CHECK (
        metadata->>'user_id' = auth.uid()::text
    );

-- 4. Role-based access using JWT claims
CREATE POLICY "admin_full_access"
    ON public.events
    FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- 5. Time-based access: users can only see events from the last 30 days
CREATE POLICY "recent_events_only"
    ON public.events
    FOR SELECT
    TO authenticated
    USING (
        created_at > now() - INTERVAL '30 days'
        AND metadata->>'user_id' = auth.uid()::text
    );
```

### RLS Helper Functions

```sql
-- Helper: check if current user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'role') = required_role,
        false
    );
$$;

-- Use in policies
CREATE POLICY "agents_read_all"
    ON public.events
    FOR SELECT
    TO authenticated
    USING (public.has_role('agent'));
```

### RLS Performance Tips

1. **Index the columns used in policies.** If your policy filters on `metadata->>'user_id'`, create an expression index:
   ```sql
   CREATE INDEX idx_events_user_id ON public.events ((metadata->>'user_id'));
   ```
2. **Use SECURITY DEFINER functions** for complex permission checks (they run as the function owner).
3. **Avoid subqueries in policies** when possible -- they run per-row and can be slow.
4. **Use `auth.uid()` and `auth.jwt()`** which are lightweight built-in functions.

---

## 4. Database Migrations

Supabase supports migrations through the Supabase CLI (`supabase migration`), which generates
timestamped SQL migration files.

### Migration Workflow

```bash
# Initialize Supabase locally
supabase init

# Create a new migration
supabase migration new create_events_table

# This creates: supabase/migrations/20250101000000_create_events_table.sql

# Apply migrations locally
supabase db reset    # Resets and replays all migrations

# Push migrations to remote project
supabase db push

# Pull remote schema changes to local migrations
supabase db pull

# Diff local vs remote to generate a migration
supabase db diff -f my_migration_name
```

### Migration File Structure

```
supabase/
  migrations/
    20250101000000_create_events_table.sql
    20250101000001_create_memories_table.sql
    20250101000002_add_vector_columns.sql
    20250101000003_create_rls_policies.sql
    20250101000004_create_read_models.sql
  seed.sql           # Seed data for development
  config.toml        # Supabase project configuration
```

### Example Migration File

```sql
-- supabase/migrations/20250101000000_create_events_table.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create the event store table
CREATE TABLE IF NOT EXISTS public.events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id   TEXT NOT NULL,
    stream_type TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    version     BIGINT NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}',
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (stream_id, version)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_stream ON public.events (stream_id, version);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON public.events (created_at);
CREATE INDEX IF NOT EXISTS idx_events_payload ON public.events USING GIN (payload jsonb_path_ops);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "service_role_events" ON public.events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Event append function
CREATE OR REPLACE FUNCTION public.append_event(
    p_stream_id TEXT,
    p_stream_type TEXT,
    p_event_type TEXT,
    p_expected_version BIGINT,
    p_payload JSONB
)
RETURNS public.events
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_current BIGINT;
    v_result public.events;
BEGIN
    SELECT COALESCE(MAX(version), 0) INTO v_current
    FROM public.events WHERE stream_id = p_stream_id;

    IF v_current != p_expected_version THEN
        RAISE EXCEPTION 'Concurrency conflict on stream %: expected %, actual %',
            p_stream_id, p_expected_version, v_current;
    END IF;

    INSERT INTO public.events (stream_id, stream_type, event_type, version, payload)
    VALUES (p_stream_id, p_stream_type, p_event_type, v_current + 1, p_payload)
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;
```

---

## 5. Connection Pooling

Supabase provides connection pooling via **Supavisor** (successor to PgBouncer):

| Mode | Port | Behavior |
|---|---|---|
| **Transaction mode** | 6543 | Connection returned to pool after each transaction. Best for serverless/Edge Functions. |
| **Session mode** | 5432 | Connection held for the session lifetime. Required for LISTEN/NOTIFY and prepared statements. |

### Connection Strings

```
# Direct connection (session mode)
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Pooled connection (transaction mode) -- use for Edge Functions and serverless
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# For Node.js / Supabase client, connection pooling is handled automatically via the REST API
```

### Best Practices

- **Edge Functions and serverless**: Always use transaction-mode pooling (port 6543).
- **Long-running services**: Use session mode (port 5432) if you need LISTEN/NOTIFY.
- **Set connection limits**: Supabase Pro allows up to ~60 direct connections, pooler supports hundreds.
- **Use the REST API** (`supabase-js`) when possible -- it does not consume connection slots.

---

## 6. Edge Functions and Database Access

Supabase Edge Functions (Deno-based) can access the database via the Supabase client:

```typescript
// supabase/functions/process-event/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // Service role for full access
    );

    const { stream_id, event_type, payload } = await req.json();

    // Get current version
    const { data: current } = await supabase
        .from("events")
        .select("version")
        .eq("stream_id", stream_id)
        .order("version", { ascending: false })
        .limit(1)
        .single();

    const expectedVersion = current?.version ?? 0;

    // Append event using RPC
    const { data, error } = await supabase.rpc("append_event", {
        p_stream_id: stream_id,
        p_stream_type: "memory",
        p_event_type: event_type,
        p_expected_version: expectedVersion,
        p_payload: payload,
    });

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 409,
            headers: { "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
    });
});
```

---

## 7. Performance and Monitoring

### Key Queries for Monitoring

```sql
-- Check table sizes
SELECT
    schemaname,
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS data_size,
    pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Check slow queries (requires pg_stat_statements)
SELECT
    query,
    calls,
    mean_exec_time::numeric(10,2) AS avg_ms,
    total_exec_time::numeric(10,2) AS total_ms,
    rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check index usage
SELECT
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan AS times_used,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Identify missing indexes
SELECT
    relname AS table_name,
    seq_scan,
    seq_tup_read,
    idx_scan,
    CASE WHEN seq_scan > 0
        THEN round(seq_tup_read::numeric / seq_scan, 0)
        ELSE 0
    END AS avg_rows_per_seq_scan
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_tup_read DESC;
```

---

## Summary: Key Decisions for JARVIS Memory System

1. **Event store** lives in `public.events` with optimistic concurrency via `append_event()`.
2. **Read models** are materialized views refreshed via `pg_cron`.
3. **Vector embeddings** use pgvector extension (see `pgvector.md` for details).
4. **RLS** protects multi-agent access: each agent's memory is isolated by policies.
5. **Migrations** managed via Supabase CLI for reproducible deployments.
6. **Connection pooling** via Supavisor in transaction mode for all serverless workloads.
7. **Custom schemas** (`jarvis_internal`) isolate internal logic from the public API.
