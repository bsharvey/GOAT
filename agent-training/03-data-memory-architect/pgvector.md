---
archetypes: [meridian, karen]
skills: [data-memory, research]
training_cluster: 03-data-memory-architect
domain: data
difficulty: intermediate
version: 1.0
---
# pgvector: Vector Similarity Search in Postgres

## Overview

pgvector is a Postgres extension that adds support for vector data types and similarity search
directly inside the database. For JARVIS, pgvector is the foundation of semantic memory -- it
stores embeddings generated from conversations, documents, and agent observations, enabling
retrieval-augmented generation (RAG) and the six-tier memory system.

Key capabilities:
- Store vectors as a native column type alongside relational data
- Perform exact and approximate nearest neighbor (ANN) search
- Support multiple distance functions: L2 (Euclidean), inner product, cosine
- Build high-performance indexes: HNSW (recommended) and IVFFlat
- Filter results using standard SQL WHERE clauses during vector search

---

## 1. Enabling pgvector

```sql
-- Enable the extension (Supabase installs it in the extensions schema)
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check version (0.7.0+ recommended for HNSW and halfvec support)
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

---

## 2. Vector Column Types

pgvector provides several vector types:

| Type | Storage | Precision | Use Case |
|---|---|---|---|
| `vector(n)` | 4 bytes per dimension | float32 | Default, full precision embeddings |
| `halfvec(n)` | 2 bytes per dimension | float16 | 2x storage savings, minimal quality loss |
| `sparsevec(n)` | Variable | float32 | Sparse vectors (mostly zeros), BM25 features |
| `bit(n)` | 1 bit per dimension | binary | Binary quantized vectors, very fast |

### Dimension Limits

- `vector`: up to 2,000 dimensions
- `halfvec`: up to 4,000 dimensions
- `sparsevec`: up to 1,000,000 non-zero elements

### Common Embedding Model Dimensions

| Model | Dimensions | Recommended Type |
|---|---|---|
| OpenAI `text-embedding-3-small` | 1536 | `vector(1536)` |
| OpenAI `text-embedding-3-large` | 3072 | `halfvec(3072)` or `vector(3072)` |
| OpenAI `text-embedding-ada-002` | 1536 | `vector(1536)` |
| Cohere `embed-english-v3.0` | 1024 | `vector(1024)` |
| Voyage AI `voyage-large-2` | 1536 | `vector(1536)` |
| BGE `bge-large-en-v1.5` | 1024 | `vector(1024)` |
| Nomic `nomic-embed-text-v1.5` | 768 | `vector(768)` |

---

## 3. Creating Tables with Vector Columns

### Basic Memory Table

```sql
CREATE TABLE public.memories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content         TEXT NOT NULL,
    summary         TEXT,
    memory_tier     SMALLINT NOT NULL DEFAULT 1,  -- 1-6 tier system
    memory_type     TEXT NOT NULL,                 -- episodic, semantic, procedural, etc.
    source_event_id UUID REFERENCES public.events(id),
    embedding       vector(1536),                 -- Full-precision embeddings
    metadata        JSONB NOT NULL DEFAULT '{}',
    importance      FLOAT NOT NULL DEFAULT 0.5,   -- 0.0 to 1.0 importance score
    access_count    INTEGER NOT NULL DEFAULT 0,
    last_accessed   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ                   -- NULL = never expires
);

-- Enable RLS
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
```

### Multi-Vector Table (for hybrid search)

```sql
CREATE TABLE public.documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    chunk_index     INTEGER NOT NULL DEFAULT 0,
    parent_doc_id   UUID,

    -- Dense embedding for semantic search
    embedding       vector(1536),

    -- Sparse embedding for keyword/BM25-style search
    sparse_embedding sparsevec(100000),

    -- Binary embedding for fast pre-filtering
    binary_embedding bit(1536),

    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Emotional State Model Table

```sql
CREATE TABLE public.emotional_states (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        TEXT NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Emotional state as a vector (each dimension = an emotion axis)
    -- e.g., [valence, arousal, dominance, curiosity, confidence, frustration, ...]
    state_vector    vector(16),

    -- Context embedding for what triggered this state
    context_embedding vector(1536),

    -- Discrete labels
    primary_emotion TEXT NOT NULL,
    intensity       FLOAT NOT NULL CHECK (intensity BETWEEN 0 AND 1),
    trigger_event   TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}'
);
```

---

## 4. Distance Functions

pgvector supports three primary distance functions:

### L2 Distance (Euclidean)

```sql
-- Operator: <->
-- Measures the straight-line distance between two vectors
-- Range: [0, +inf)  Lower = more similar
-- Best for: general-purpose, when embeddings are NOT normalized

SELECT id, content,
    embedding <-> '[0.1, 0.2, ...]'::vector AS distance
FROM memories
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

### Inner Product (Negative)

```sql
-- Operator: <#>
-- Computes the NEGATIVE inner product (so ORDER BY ASC gives highest similarity)
-- Range: (-inf, +inf)  Lower (more negative) = more similar
-- Best for: when you want dot-product similarity, models that output unnormalized embeddings

SELECT id, content,
    (embedding <#> '[0.1, 0.2, ...]'::vector) * -1 AS similarity
FROM memories
ORDER BY embedding <#> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

### Cosine Distance

```sql
-- Operator: <=>
-- Computes 1 - cosine_similarity
-- Range: [0, 2]  Lower = more similar, 0 = identical direction
-- Best for: OpenAI embeddings, most text embedding models (direction matters, not magnitude)

SELECT id, content,
    1 - (embedding <=> '[0.1, 0.2, ...]'::vector) AS cosine_similarity
FROM memories
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

### Which Distance Function to Use?

| Scenario | Function | Operator |
|---|---|---|
| OpenAI embeddings | Cosine distance | `<=>` |
| Normalized embeddings | Inner product or cosine | `<#>` or `<=>` |
| Pre-normalized (unit vectors) | Inner product | `<#>` (equivalent to cosine, faster) |
| Spatial/numeric data | L2 distance | `<->` |
| Emotional state vectors | L2 distance | `<->` |

**Pro tip:** If you normalize embeddings before insertion, inner product (`<#>`) gives the same
ranking as cosine distance (`<=>`) but is slightly faster because it skips the normalization step.

---

## 5. Indexes: HNSW vs IVFFlat

Without an index, pgvector performs **exact nearest neighbor search** (scans every row). For
production workloads, you need an approximate nearest neighbor (ANN) index.

### HNSW (Hierarchical Navigable Small World) -- RECOMMENDED

HNSW builds a multi-layer graph for fast approximate search. It is the **recommended index type**
for most workloads.

```sql
-- Create an HNSW index for cosine distance
CREATE INDEX idx_memories_embedding_hnsw ON public.memories
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- HNSW index for L2 distance
CREATE INDEX idx_memories_embedding_l2 ON public.memories
    USING hnsw (embedding vector_l2_ops)
    WITH (m = 16, ef_construction = 64);

-- HNSW index for inner product
CREATE INDEX idx_memories_embedding_ip ON public.memories
    USING hnsw (embedding vector_ip_ops)
    WITH (m = 16, ef_construction = 64);
```

#### HNSW Parameters

| Parameter | Default | Description | Guidance |
|---|---|---|---|
| `m` | 16 | Max connections per node per layer | Higher = better recall, more memory. Range: 8-64 |
| `ef_construction` | 64 | Size of dynamic candidate list during build | Higher = better index quality, slower build. Range: 64-256 |

#### HNSW Query-Time Parameters

```sql
-- Set the search beam width (higher = better recall, slower query)
-- Default is 40. Increase for better accuracy.
SET hnsw.ef_search = 100;

-- This is a session/transaction-level setting
-- For a single query:
SET LOCAL hnsw.ef_search = 200;
```

#### HNSW Characteristics

- **Build time:** Slow (hours for millions of vectors), but supports concurrent inserts
- **Query time:** Very fast, O(log n)
- **Memory:** ~1.5x the raw vector data
- **Recall:** 95-99%+ with good parameters
- **Insert after build:** Supported (no rebuild needed)

### IVFFlat (Inverted File with Flat Compression)

IVFFlat partitions vectors into lists (clusters) and searches only the nearest clusters.

```sql
-- Create an IVFFlat index
-- The number of lists should be ~ sqrt(num_rows) for < 1M rows
-- or num_rows / 1000 for > 1M rows
CREATE INDEX idx_memories_embedding_ivf ON public.memories
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

#### IVFFlat Parameters

| Parameter | Default | Description | Guidance |
|---|---|---|---|
| `lists` | - | Number of inverted lists (clusters) | sqrt(rows) for <1M, rows/1000 for >1M |

#### IVFFlat Query-Time Parameters

```sql
-- Number of lists to probe (higher = better recall, slower)
-- Default is 1. Recommended: sqrt(lists)
SET ivfflat.probes = 10;
```

#### IVFFlat Characteristics

- **Build time:** Faster than HNSW
- **Query time:** Fast, but slower than HNSW for same recall
- **Memory:** Less than HNSW
- **Recall:** 90-95% with good parameters
- **Insert after build:** Requires periodic REINDEX for new data

### Comparison

| Aspect | HNSW | IVFFlat |
|---|---|---|
| Recall at speed | Better | Good |
| Build time | Slower | Faster |
| Memory usage | Higher | Lower |
| Insert without rebuild | Yes | Needs REINDEX |
| Best for | Production queries | Quick prototyping, static data |

**Recommendation for JARVIS:** Use HNSW for all production memory indexes. Use IVFFlat only
during development or for very large, rarely-updated archival data.

---

## 6. Inserting Vectors

### Single Insert

```sql
INSERT INTO public.memories (content, memory_tier, memory_type, embedding, metadata)
VALUES (
    'The user prefers dark mode interfaces and responds well to technical explanations.',
    2,
    'preference',
    '[0.023, -0.041, 0.087, ...]'::vector,  -- 1536-dimensional vector
    '{"source": "conversation", "confidence": 0.92}'
);
```

### Batch Insert

```sql
-- Use COPY for bulk loading (fastest)
-- Or multi-row INSERT:
INSERT INTO public.memories (content, memory_tier, memory_type, embedding)
VALUES
    ('Memory 1 content', 1, 'episodic', '[...]'::vector),
    ('Memory 2 content', 1, 'episodic', '[...]'::vector),
    ('Memory 3 content', 2, 'semantic', '[...]'::vector);
```

### Insert from Application (supabase-js)

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Generate embedding (e.g., via OpenAI)
const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: "The user prefers dark mode interfaces.",
});
const embedding = embeddingResponse.data[0].embedding;

// Insert into Supabase
const { data, error } = await supabase
    .from("memories")
    .insert({
        content: "The user prefers dark mode interfaces.",
        memory_tier: 2,
        memory_type: "preference",
        embedding: embedding,  // Array of numbers, auto-cast to vector
        metadata: { source: "conversation", confidence: 0.92 },
    })
    .select()
    .single();
```

---

## 7. Querying Vectors: Nearest Neighbor Search

### Basic Similarity Search

```sql
-- Find the 10 most similar memories to a query embedding
SELECT
    id,
    content,
    memory_tier,
    memory_type,
    1 - (embedding <=> $1) AS similarity,
    metadata
FROM public.memories
WHERE embedding IS NOT NULL
ORDER BY embedding <=> $1  -- $1 is the query vector
LIMIT 10;
```

### Filtered Similarity Search

```sql
-- Search within a specific memory tier and type
SELECT
    id,
    content,
    1 - (embedding <=> $1) AS similarity
FROM public.memories
WHERE
    memory_tier = 3
    AND memory_type = 'semantic'
    AND (expires_at IS NULL OR expires_at > now())
    AND embedding IS NOT NULL
ORDER BY embedding <=> $1
LIMIT 10;
```

### Similarity Threshold Search

```sql
-- Only return memories above a similarity threshold
SELECT
    id,
    content,
    1 - (embedding <=> $1) AS similarity
FROM public.memories
WHERE
    embedding IS NOT NULL
    AND 1 - (embedding <=> $1) > 0.75  -- Minimum similarity threshold
ORDER BY embedding <=> $1
LIMIT 20;
```

### Hybrid Search: Vector + Full-Text

```sql
-- Combine semantic similarity with keyword matching
-- Uses Reciprocal Rank Fusion (RRF) to merge rankings

WITH semantic AS (
    SELECT
        id,
        content,
        ROW_NUMBER() OVER (ORDER BY embedding <=> $1) AS rank_semantic
    FROM public.memories
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> $1
    LIMIT 50
),
keyword AS (
    SELECT
        id,
        content,
        ROW_NUMBER() OVER (ORDER BY ts_rank(
            to_tsvector('english', content),
            plainto_tsquery('english', $2)
        ) DESC) AS rank_keyword
    FROM public.memories
    WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $2)
    LIMIT 50
)
SELECT
    COALESCE(s.id, k.id) AS id,
    COALESCE(s.content, k.content) AS content,
    -- RRF score: 1/(k+rank) summed across methods
    COALESCE(1.0 / (60 + s.rank_semantic), 0) +
    COALESCE(1.0 / (60 + k.rank_keyword), 0) AS rrf_score
FROM semantic s
FULL OUTER JOIN keyword k ON s.id = k.id
ORDER BY rrf_score DESC
LIMIT 10;
```

### Search as a Postgres Function (for RPC calls)

```sql
-- Create a function for vector similarity search (callable via supabase.rpc())
CREATE OR REPLACE FUNCTION public.search_memories(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INTEGER DEFAULT 10,
    filter_tier INTEGER DEFAULT NULL,
    filter_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    summary TEXT,
    memory_tier SMALLINT,
    memory_type TEXT,
    similarity FLOAT,
    metadata JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.content,
        m.summary,
        m.memory_tier,
        m.memory_type,
        (1 - (m.embedding <=> query_embedding))::FLOAT AS similarity,
        m.metadata,
        m.created_at
    FROM public.memories m
    WHERE
        m.embedding IS NOT NULL
        AND 1 - (m.embedding <=> query_embedding) > match_threshold
        AND (filter_tier IS NULL OR m.memory_tier = filter_tier)
        AND (filter_type IS NULL OR m.memory_type = filter_type)
        AND (m.expires_at IS NULL OR m.expires_at > now())
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Call from supabase-js:
-- const { data } = await supabase.rpc('search_memories', {
--     query_embedding: embeddingArray,
--     match_threshold: 0.75,
--     match_count: 10,
--     filter_tier: 3,
-- });
```

---

## 8. Performance Tuning

### Index Build Parameters

```sql
-- For large tables (1M+ rows), increase maintenance_work_mem before building
SET maintenance_work_mem = '2GB';

-- Build HNSW index with high quality
CREATE INDEX CONCURRENTLY idx_memories_hnsw ON public.memories
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 24, ef_construction = 128);

-- Reset
RESET maintenance_work_mem;
```

### Query Tuning

```sql
-- Increase ef_search for better recall (at the cost of latency)
SET hnsw.ef_search = 100;  -- Default 40, increase for better recall

-- For IVFFlat, increase probes
SET ivfflat.probes = 20;   -- Default 1, increase to sqrt(lists)

-- Check if index is being used
EXPLAIN ANALYZE
SELECT id, content, embedding <=> '[...]'::vector AS distance
FROM memories
ORDER BY embedding <=> '[...]'::vector
LIMIT 10;
-- Look for "Index Scan using idx_memories_hnsw" in output
```

### Monitoring Index Performance

```sql
-- Check index size
SELECT
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE relname = 'memories';

-- Check approximate row count (fast)
SELECT reltuples::bigint AS estimated_rows
FROM pg_class
WHERE relname = 'memories';

-- Analyze table statistics after bulk inserts
ANALYZE public.memories;
```

### Scaling Strategies

1. **Partitioning by memory tier:** Separate indexes per partition for faster queries.
   ```sql
   CREATE TABLE public.memories_partitioned (
       LIKE public.memories INCLUDING ALL
   ) PARTITION BY LIST (memory_tier);

   CREATE TABLE memories_tier_1 PARTITION OF memories_partitioned FOR VALUES IN (1);
   CREATE TABLE memories_tier_2 PARTITION OF memories_partitioned FOR VALUES IN (2);
   -- Each partition gets its own HNSW index
   ```

2. **Dimensionality reduction:** Use `halfvec` to halve storage.
   ```sql
   ALTER TABLE memories ADD COLUMN embedding_half halfvec(1536);
   UPDATE memories SET embedding_half = embedding::halfvec;
   CREATE INDEX ON memories USING hnsw (embedding_half halfvec_cosine_ops);
   ```

3. **Pre-filtering with metadata:** Add a partial index for common query patterns.
   ```sql
   -- Index only active, high-tier memories (smaller index, faster queries)
   CREATE INDEX idx_memories_active_semantic ON public.memories
       USING hnsw (embedding vector_cosine_ops)
       WITH (m = 16, ef_construction = 64)
       WHERE memory_tier >= 3
         AND (expires_at IS NULL OR expires_at > now());
   ```

4. **Binary quantization for pre-filtering:**
   ```sql
   -- Store a binary version for ultra-fast initial filtering
   -- Then re-rank with full-precision vectors
   ALTER TABLE memories ADD COLUMN embedding_binary bit(1536);

   -- Hamming distance is extremely fast
   SELECT id FROM memories
   ORDER BY embedding_binary <~> $1::bit(1536)
   LIMIT 100;
   -- Then re-rank top 100 with full cosine distance
   ```

---

## 9. Summary: pgvector Decisions for JARVIS Memory System

1. **Vector type:** `vector(1536)` for OpenAI `text-embedding-3-small` embeddings.
2. **Distance function:** Cosine distance (`<=>`) for all text-based similarity search.
3. **Index type:** HNSW with `m=16, ef_construction=64` (increase for larger datasets).
4. **Query-time tuning:** `hnsw.ef_search = 100` for production accuracy.
5. **Hybrid search:** Combine vector similarity with full-text search using RRF scoring.
6. **Memory tiers:** Partition by tier, with separate HNSW indexes per partition.
7. **Search function:** Expose via `search_memories()` RPC for clean API access.
8. **Emotional state:** L2 distance (`<->`) for emotional state vector comparisons.
