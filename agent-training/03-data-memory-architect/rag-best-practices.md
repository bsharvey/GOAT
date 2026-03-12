---
archetypes: [meridian, karen]
skills: [data-memory, research, pattern-memory]
training_cluster: 03-data-memory-architect
domain: ai
difficulty: advanced
version: 1.0
---
# RAG Pipeline Best Practices: Retrieval Augmented Generation

## Overview

Retrieval Augmented Generation (RAG) is the pattern of enhancing LLM responses by retrieving
relevant context from external knowledge stores before generation. For the JARVIS Data/Memory
Architect, the RAG pipeline is how agents access the six-tier memory system -- converting queries
into embeddings, searching vector stores, re-ranking results, and assembling context for the LLM.

A well-designed RAG pipeline consists of five stages:

```
 ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
 │ Document  │───►│ Chunking │───►│ Embedding│───►│ Indexing  │───►│ Stored   │
 │ Ingestion │    │ Strategy │    │ Model    │    │ (pgvector)│    │ in DB    │
 └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘

 ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
 │ User     │───►│ Query    │───►│ Retrieval│───►│ Re-rank  │───►│ LLM      │
 │ Query    │    │ Embedding│    │ Search   │    │ & Filter │    │ Generation│
 └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## 1. Document Chunking Strategies

Chunking is the most critical step in the RAG pipeline. Poor chunking leads to poor retrieval,
regardless of how good the embedding model or search algorithm is.

### 1.1 Fixed-Size Chunking

Split text into chunks of a fixed token/character count with overlap.

```typescript
interface FixedSizeChunkOptions {
    chunkSize: number;      // Target size in tokens
    chunkOverlap: number;   // Overlap between consecutive chunks (in tokens)
    separator?: string;     // Prefer splitting on this character
}

function fixedSizeChunk(text: string, options: FixedSizeChunkOptions): string[] {
    const { chunkSize, chunkOverlap, separator = "\n" } = options;
    const chunks: string[] = [];

    // Split into sentences/paragraphs first, then recombine to target size
    const segments = text.split(separator);
    let currentChunk = "";
    let currentTokens = 0;

    for (const segment of segments) {
        const segmentTokens = estimateTokens(segment);

        if (currentTokens + segmentTokens > chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());

            // Start new chunk with overlap from the end of the previous chunk
            const overlapText = getLastNTokens(currentChunk, chunkOverlap);
            currentChunk = overlapText + separator + segment;
            currentTokens = estimateTokens(currentChunk);
        } else {
            currentChunk += separator + segment;
            currentTokens += segmentTokens;
        }
    }

    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

function estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
}

// Usage:
const chunks = fixedSizeChunk(documentText, {
    chunkSize: 512,      // 512 tokens per chunk
    chunkOverlap: 64,    // 64 token overlap
    separator: "\n\n",   // Split on paragraphs
});
```

**When to use:** Simple documents, uniform structure, baseline approach.
**Chunk size guidance:**
- 256 tokens: Fine-grained retrieval, good for Q&A
- 512 tokens: Balanced (recommended default for JARVIS)
- 1024 tokens: More context per chunk, good for summarization

### 1.2 Semantic Chunking

Split based on meaning boundaries detected by embedding similarity.

```typescript
interface SemanticChunkOptions {
    maxChunkSize: number;
    similarityThreshold: number;  // 0.0-1.0: lower = more aggressive splitting
    embeddingModel: EmbeddingModel;
}

async function semanticChunk(
    text: string,
    options: SemanticChunkOptions
): Promise<string[]> {
    const { maxChunkSize, similarityThreshold, embeddingModel } = options;

    // Step 1: Split into sentences
    const sentences = splitIntoSentences(text);

    // Step 2: Embed each sentence
    const sentenceEmbeddings = await embeddingModel.embedBatch(sentences);

    // Step 3: Find semantic breakpoints
    const breakpoints: number[] = [0];

    for (let i = 1; i < sentenceEmbeddings.length; i++) {
        const similarity = cosineSimilarity(
            sentenceEmbeddings[i - 1],
            sentenceEmbeddings[i]
        );

        // If similarity drops below threshold, this is a semantic boundary
        if (similarity < similarityThreshold) {
            breakpoints.push(i);
        }
    }

    breakpoints.push(sentences.length);

    // Step 4: Group sentences into chunks at breakpoints
    const chunks: string[] = [];
    for (let i = 0; i < breakpoints.length - 1; i++) {
        const chunk = sentences
            .slice(breakpoints[i], breakpoints[i + 1])
            .join(" ");

        // If chunk exceeds max size, sub-split with fixed-size
        if (estimateTokens(chunk) > maxChunkSize) {
            const subChunks = fixedSizeChunk(chunk, {
                chunkSize: maxChunkSize,
                chunkOverlap: 32,
            });
            chunks.push(...subChunks);
        } else {
            chunks.push(chunk);
        }
    }

    return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**When to use:** Documents with varied structure, conversations, long-form text where topic
shifts matter. Best for the JARVIS memory system where conversation turns have natural boundaries.

### 1.3 Recursive Character Text Splitting

Split hierarchically: try paragraph boundaries first, then sentence boundaries, then word
boundaries, as a fallback chain.

```typescript
const RECURSIVE_SEPARATORS = [
    "\n\n\n",   // Triple newline (section breaks)
    "\n\n",     // Double newline (paragraphs)
    "\n",       // Single newline
    ". ",       // Sentences
    ", ",       // Clauses
    " ",        // Words
    "",         // Characters (last resort)
];

function recursiveChunk(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
    separators: string[] = RECURSIVE_SEPARATORS
): string[] {
    const chunks: string[] = [];

    // Find the first separator that exists in the text
    let separator = "";
    for (const sep of separators) {
        if (text.includes(sep)) {
            separator = sep;
            break;
        }
    }

    // Split on that separator
    const splits = separator ? text.split(separator) : [text];

    let currentChunk = "";
    for (const split of splits) {
        const candidate = currentChunk
            ? currentChunk + separator + split
            : split;

        if (estimateTokens(candidate) <= chunkSize) {
            currentChunk = candidate;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
            }

            // If a single split is still too large, recursively split it
            if (estimateTokens(split) > chunkSize) {
                const remainingSeparators = separators.slice(
                    separators.indexOf(separator) + 1
                );
                const subChunks = recursiveChunk(
                    split,
                    chunkSize,
                    chunkOverlap,
                    remainingSeparators
                );
                chunks.push(...subChunks);
                currentChunk = "";
            } else {
                // Start new chunk with overlap
                const overlap = getLastNTokens(
                    chunks[chunks.length - 1] ?? "",
                    chunkOverlap
                );
                currentChunk = overlap ? overlap + separator + split : split;
            }
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}
```

**When to use:** General-purpose, works well for most document types. Good default.

### 1.4 Agentic / Parent-Child Chunking

Store both large parent chunks (for context) and small child chunks (for precise retrieval).
Search on child chunks, but return parent chunks to the LLM.

```typescript
interface ParentChildChunk {
    parent_id: string;
    parent_content: string;   // Large chunk (e.g., 2048 tokens) -- sent to LLM
    child_id: string;
    child_content: string;    // Small chunk (e.g., 256 tokens) -- used for search
    child_embedding: number[];
    child_index: number;      // Position within parent
}

async function parentChildChunk(
    text: string,
    parentSize: number = 2048,
    childSize: number = 256,
    childOverlap: number = 32
): Promise<ParentChildChunk[]> {
    // Create large parent chunks
    const parents = fixedSizeChunk(text, {
        chunkSize: parentSize,
        chunkOverlap: 128,
    });

    const results: ParentChildChunk[] = [];

    for (let pi = 0; pi < parents.length; pi++) {
        const parentId = generateId();
        const parentContent = parents[pi];

        // Split each parent into smaller child chunks
        const children = fixedSizeChunk(parentContent, {
            chunkSize: childSize,
            chunkOverlap: childOverlap,
        });

        for (let ci = 0; ci < children.length; ci++) {
            const childEmbedding = await embed(children[ci]);
            results.push({
                parent_id: parentId,
                parent_content: parentContent,
                child_id: `${parentId}-${ci}`,
                child_content: children[ci],
                child_embedding: childEmbedding,
                child_index: ci,
            });
        }
    }

    return results;
}
```

**When to use:** When you need precise retrieval but rich context for generation. Recommended
for JARVIS when processing long documents or conversation histories.

### Chunking Strategy Comparison

| Strategy | Precision | Context | Complexity | Best For |
|---|---|---|---|---|
| Fixed-size | Medium | Medium | Low | Uniform documents |
| Semantic | High | High | High | Conversations, varied text |
| Recursive | Medium-High | Medium | Medium | General purpose (default) |
| Parent-child | Very High | Very High | High | Long documents, rich context |

---

## 2. Embedding Model Selection

### Key Factors

| Factor | Consideration |
|---|---|
| Dimensions | Higher = more expressive, but slower search and more storage |
| Max tokens | Maximum input length the model can embed |
| Quality | MTEB benchmark score (higher = better retrieval quality) |
| Speed | Latency and throughput for batch embedding |
| Cost | Price per token/request |
| Matryoshka | Supports dimension reduction without retraining |

### Recommended Models (as of early 2025)

| Model | Dims | Max Tokens | MTEB Avg | Notes |
|---|---|---|---|---|
| `text-embedding-3-small` (OpenAI) | 1536 | 8191 | ~62 | Good balance, Matryoshka support |
| `text-embedding-3-large` (OpenAI) | 3072 | 8191 | ~64 | Highest quality from OpenAI |
| `voyage-large-2` (Voyage AI) | 1536 | 16000 | ~66 | Excellent quality, long context |
| `embed-english-v3.0` (Cohere) | 1024 | 512 | ~64 | Good quality, lower dimensions |
| `bge-large-en-v1.5` (BAAI) | 1024 | 512 | ~64 | Open source, self-hostable |
| `nomic-embed-text-v1.5` (Nomic) | 768 | 8192 | ~62 | Open source, long context, Matryoshka |
| `mxbai-embed-large-v1` (Mixedbread) | 1024 | 512 | ~65 | Open source, high quality |

### Embedding Best Practices

```typescript
// 1. Use instruction prefixes for asymmetric search
//    Many models perform better when you prefix queries differently from documents

// For indexing (documents/memories):
const docEmbedding = await embed("passage: " + memoryContent);

// For searching (queries):
const queryEmbedding = await embed("query: " + userQuestion);

// 2. Batch embedding for efficiency
async function embedBatch(texts: string[]): Promise<number[][]> {
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,  // Up to 2048 inputs per batch
    });
    return response.data.map((d) => d.embedding);
}

// 3. Matryoshka dimension reduction (OpenAI text-embedding-3-*)
//    Truncate embeddings to fewer dimensions for faster search
function truncateEmbedding(embedding: number[], targetDims: number): number[] {
    const truncated = embedding.slice(0, targetDims);
    // Re-normalize after truncation
    const norm = Math.sqrt(truncated.reduce((sum, v) => sum + v * v, 0));
    return truncated.map((v) => v / norm);
}

// Use 512 dimensions instead of 1536 for 3x faster search, ~2% quality loss
const compactEmbedding = truncateEmbedding(fullEmbedding, 512);

// 4. Cache embeddings aggressively
//    Never re-embed the same content twice
const embeddingCache = new Map<string, number[]>();

async function embedWithCache(text: string): Promise<number[]> {
    const key = hashText(text);
    if (embeddingCache.has(key)) {
        return embeddingCache.get(key)!;
    }
    const embedding = await embed(text);
    embeddingCache.set(key, embedding);
    return embedding;
}
```

---

## 3. Vector Store Indexing

### Index Setup in pgvector (Supabase)

```sql
-- Table for RAG document chunks
CREATE TABLE public.rag_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL,
    chunk_index     INTEGER NOT NULL,
    content         TEXT NOT NULL,
    token_count     INTEGER NOT NULL,
    embedding       vector(1536),
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index (recommended for production)
CREATE INDEX idx_rag_chunks_hnsw ON public.rag_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 100);

-- Full-text search index for hybrid search
ALTER TABLE public.rag_chunks ADD COLUMN fts tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX idx_rag_chunks_fts ON public.rag_chunks USING GIN (fts);

-- Metadata index for filtered search
CREATE INDEX idx_rag_chunks_metadata ON public.rag_chunks USING GIN (metadata jsonb_path_ops);

-- Composite index for memory tier filtering + vector search
-- (partial index: only index active memories)
CREATE INDEX idx_rag_active_memories ON public.memories
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 100)
    WHERE embedding IS NOT NULL
      AND (expires_at IS NULL OR expires_at > now());
```

---

## 4. Retrieval Strategies

### 4.1 Basic Similarity Search

```sql
-- Simple nearest-neighbor search
CREATE OR REPLACE FUNCTION public.rag_search(
    query_embedding vector(1536),
    match_count INTEGER DEFAULT 10,
    match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT,
    metadata JSONB
)
LANGUAGE sql STABLE
AS $$
    SELECT
        rc.id,
        rc.content,
        (1 - (rc.embedding <=> query_embedding))::FLOAT AS similarity,
        rc.metadata
    FROM public.rag_chunks rc
    WHERE rc.embedding IS NOT NULL
      AND (1 - (rc.embedding <=> query_embedding)) > match_threshold
    ORDER BY rc.embedding <=> query_embedding
    LIMIT match_count;
$$;
```

### 4.2 Maximal Marginal Relevance (MMR)

MMR balances relevance with diversity -- it avoids returning multiple chunks that say the same
thing. This is critical for JARVIS where memories may have overlapping content.

```typescript
interface MMROptions {
    queryEmbedding: number[];
    candidates: Array<{ id: string; content: string; embedding: number[] }>;
    k: number;             // Number of results to return
    lambda: number;        // 0.0 = max diversity, 1.0 = max relevance (default: 0.7)
}

function mmrSearch(options: MMROptions): Array<{ id: string; content: string; score: number }> {
    const { queryEmbedding, candidates, k, lambda = 0.7 } = options;
    const selected: Array<{ id: string; content: string; score: number }> = [];
    const remaining = [...candidates];

    // Calculate query similarity for all candidates
    const querySimilarities = new Map<string, number>();
    for (const candidate of candidates) {
        querySimilarities.set(
            candidate.id,
            cosineSimilarity(queryEmbedding, candidate.embedding)
        );
    }

    for (let i = 0; i < k && remaining.length > 0; i++) {
        let bestScore = -Infinity;
        let bestIdx = 0;

        for (let j = 0; j < remaining.length; j++) {
            const candidate = remaining[j];

            // Relevance: similarity to query
            const relevance = querySimilarities.get(candidate.id)!;

            // Diversity: max similarity to already-selected results
            let maxSimilarityToSelected = 0;
            for (const sel of selected) {
                const selCandidate = candidates.find((c) => c.id === sel.id)!;
                const sim = cosineSimilarity(candidate.embedding, selCandidate.embedding);
                maxSimilarityToSelected = Math.max(maxSimilarityToSelected, sim);
            }

            // MMR score: balance relevance and diversity
            const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarityToSelected;

            if (mmrScore > bestScore) {
                bestScore = mmrScore;
                bestIdx = j;
            }
        }

        const chosen = remaining.splice(bestIdx, 1)[0];
        selected.push({
            id: chosen.id,
            content: chosen.content,
            score: bestScore,
        });
    }

    return selected;
}
```

### 4.3 Hybrid Search (Vector + Keyword)

Combines semantic similarity with keyword matching using Reciprocal Rank Fusion (RRF).

```sql
-- Hybrid search function combining vector similarity and full-text search
CREATE OR REPLACE FUNCTION public.rag_hybrid_search(
    query_embedding vector(1536),
    query_text TEXT,
    match_count INTEGER DEFAULT 10,
    vector_weight FLOAT DEFAULT 0.7,   -- Weight for vector results
    keyword_weight FLOAT DEFAULT 0.3,  -- Weight for keyword results
    rrf_k INTEGER DEFAULT 60           -- RRF constant
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    rrf_score FLOAT,
    vector_rank INTEGER,
    keyword_rank INTEGER,
    metadata JSONB
)
LANGUAGE sql STABLE
AS $$
    WITH vector_results AS (
        SELECT
            rc.id,
            rc.content,
            rc.metadata,
            ROW_NUMBER() OVER (
                ORDER BY rc.embedding <=> query_embedding
            )::INTEGER AS rank
        FROM public.rag_chunks rc
        WHERE rc.embedding IS NOT NULL
        ORDER BY rc.embedding <=> query_embedding
        LIMIT match_count * 3  -- Fetch more candidates for fusion
    ),
    keyword_results AS (
        SELECT
            rc.id,
            rc.content,
            rc.metadata,
            ROW_NUMBER() OVER (
                ORDER BY ts_rank_cd(rc.fts, websearch_to_tsquery('english', query_text)) DESC
            )::INTEGER AS rank
        FROM public.rag_chunks rc
        WHERE rc.fts @@ websearch_to_tsquery('english', query_text)
        ORDER BY ts_rank_cd(rc.fts, websearch_to_tsquery('english', query_text)) DESC
        LIMIT match_count * 3
    )
    SELECT
        COALESCE(v.id, k.id) AS id,
        COALESCE(v.content, k.content) AS content,
        (
            COALESCE(vector_weight / (rrf_k + v.rank)::FLOAT, 0) +
            COALESCE(keyword_weight / (rrf_k + k.rank)::FLOAT, 0)
        ) AS rrf_score,
        v.rank AS vector_rank,
        k.rank AS keyword_rank,
        COALESCE(v.metadata, k.metadata) AS metadata
    FROM vector_results v
    FULL OUTER JOIN keyword_results k ON v.id = k.id
    ORDER BY rrf_score DESC
    LIMIT match_count;
$$;
```

### 4.4 Multi-Query Retrieval

Generate multiple reformulations of the user's query to improve recall.

```typescript
async function multiQueryRetrieve(
    originalQuery: string,
    llm: LLMClient,
    searchFn: (embedding: number[]) => Promise<SearchResult[]>,
    numQueries: number = 3
): Promise<SearchResult[]> {
    // Step 1: Generate query variations using the LLM
    const variationsPrompt = `Generate ${numQueries} different versions of the following question.
Each version should approach the topic from a different angle to help find relevant information.
Return only the questions, one per line.

Original question: ${originalQuery}`;

    const variations = await llm.complete(variationsPrompt);
    const queries = [originalQuery, ...variations.split("\n").filter(Boolean)];

    // Step 2: Embed and search for each query
    const allResults = new Map<string, SearchResult>();

    for (const query of queries) {
        const embedding = await embed(query);
        const results = await searchFn(embedding);

        for (const result of results) {
            // Keep the highest similarity score for each unique result
            const existing = allResults.get(result.id);
            if (!existing || result.similarity > existing.similarity) {
                allResults.set(result.id, result);
            }
        }
    }

    // Step 3: Sort by best similarity score and return
    return Array.from(allResults.values())
        .sort((a, b) => b.similarity - a.similarity);
}
```

### 4.5 Contextual Retrieval with Memory Tiers

For JARVIS, retrieval should respect the six-tier memory hierarchy:

```typescript
async function tieredMemorySearch(
    queryEmbedding: number[],
    options: {
        tiers?: number[];        // Which tiers to search (default: all)
        limit: number;           // Total results to return
        tierWeights?: Record<number, number>;  // Weight per tier
    }
): Promise<MemorySearchResult[]> {
    const {
        tiers = [1, 2, 3, 4, 5, 6],
        limit,
        tierWeights = { 1: 1.0, 2: 0.95, 3: 0.9, 4: 0.85, 5: 0.8, 6: 0.7 },
    } = options;

    // Search each tier with its weight
    const allResults: MemorySearchResult[] = [];

    for (const tier of tiers) {
        const { data } = await supabase.rpc("search_memories", {
            query_embedding: queryEmbedding,
            match_threshold: 0.6,
            match_count: limit,
            filter_tier: tier,
        });

        if (data) {
            for (const result of data) {
                allResults.push({
                    ...result,
                    // Adjust similarity by tier weight
                    weighted_similarity: result.similarity * (tierWeights[tier] ?? 1.0),
                    tier: tier,
                });
            }
        }
    }

    // Sort by weighted similarity and return top results
    return allResults
        .sort((a, b) => b.weighted_similarity - a.weighted_similarity)
        .slice(0, limit);
}
```

---

## 5. Re-ranking

Re-ranking uses a cross-encoder model to score query-document pairs more accurately than embedding
similarity alone. It is a second-stage filter applied to the top-N results from retrieval.

### Why Re-rank?

- Bi-encoder (embedding) search is fast but imprecise -- it compresses both query and document
  into fixed vectors independently.
- Cross-encoder re-ranking processes query + document together, capturing fine-grained interactions.
- Typical improvement: 5-15% better precision in the final top-K results.

### Re-ranking Pipeline

```typescript
interface RerankerResult {
    id: string;
    content: string;
    original_score: number;
    rerank_score: number;
}

async function rerankResults(
    query: string,
    candidates: Array<{ id: string; content: string; similarity: number }>,
    topK: number = 5
): Promise<RerankerResult[]> {
    // Option 1: Use Cohere Rerank API
    const reranked = await cohereClient.rerank({
        model: "rerank-english-v3.0",
        query: query,
        documents: candidates.map((c) => c.content),
        topN: topK,
        returnDocuments: false,
    });

    return reranked.results.map((r) => ({
        id: candidates[r.index].id,
        content: candidates[r.index].content,
        original_score: candidates[r.index].similarity,
        rerank_score: r.relevanceScore,
    }));
}

// Option 2: LLM-based re-ranking (more expensive, more flexible)
async function llmRerank(
    query: string,
    candidates: Array<{ id: string; content: string }>,
    llm: LLMClient,
    topK: number = 5
): Promise<RerankerResult[]> {
    const prompt = `Rate the relevance of each document to the query on a scale of 0-10.
Return ONLY a JSON array of objects with "index" and "score" fields.

Query: ${query}

Documents:
${candidates.map((c, i) => `[${i}] ${c.content.slice(0, 500)}`).join("\n\n")}

JSON response:`;

    const response = await llm.complete(prompt);
    const scores: Array<{ index: number; score: number }> = JSON.parse(response);

    return scores
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((s) => ({
            id: candidates[s.index].id,
            content: candidates[s.index].content,
            original_score: 0,
            rerank_score: s.score / 10,
        }));
}
```

---

## 6. Context Window Management

Assembling the final context for the LLM requires careful management of the context window.

### Context Assembly Strategy

```typescript
interface ContextWindowConfig {
    maxTokens: number;         // Total context window (e.g., 128K for GPT-4)
    systemPromptTokens: number; // Reserved for system prompt
    responseTokens: number;     // Reserved for model response
    memoryTokens: number;       // Budget for retrieved memories
    conversationTokens: number; // Budget for recent conversation
}

const DEFAULT_CONFIG: ContextWindowConfig = {
    maxTokens: 128000,
    systemPromptTokens: 2000,
    responseTokens: 4000,
    memoryTokens: 8000,
    conversationTokens: 4000,
};

function assembleContext(
    systemPrompt: string,
    retrievedMemories: MemorySearchResult[],
    conversationHistory: Message[],
    config: ContextWindowConfig = DEFAULT_CONFIG
): string[] {
    const messages: string[] = [];

    // 1. System prompt (fixed budget)
    messages.push(truncateToTokens(systemPrompt, config.systemPromptTokens));

    // 2. Retrieved memories (ranked by relevance, fit to budget)
    let memoryTokensUsed = 0;
    const memoryContext: string[] = [];

    for (const memory of retrievedMemories) {
        const memoryText = formatMemory(memory);
        const tokens = estimateTokens(memoryText);

        if (memoryTokensUsed + tokens > config.memoryTokens) break;

        memoryContext.push(memoryText);
        memoryTokensUsed += tokens;
    }

    if (memoryContext.length > 0) {
        messages.push(
            "## Relevant Memories\n" + memoryContext.join("\n---\n")
        );
    }

    // 3. Conversation history (most recent first, fit to budget)
    let convTokensUsed = 0;
    const recentMessages: Message[] = [];

    for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const msg = conversationHistory[i];
        const tokens = estimateTokens(msg.content);

        if (convTokensUsed + tokens > config.conversationTokens) break;

        recentMessages.unshift(msg);
        convTokensUsed += tokens;
    }

    for (const msg of recentMessages) {
        messages.push(`${msg.role}: ${msg.content}`);
    }

    return messages;
}

function formatMemory(memory: MemorySearchResult): string {
    return [
        `[Tier ${memory.tier} | ${memory.memory_type} | similarity: ${memory.similarity.toFixed(3)}]`,
        memory.content,
        memory.summary ? `Summary: ${memory.summary}` : "",
    ].filter(Boolean).join("\n");
}
```

### Context Compression

For long conversations or many retrieved memories, compress context before sending to the LLM:

```typescript
async function compressContext(
    memories: MemorySearchResult[],
    llm: LLMClient,
    targetTokens: number
): Promise<string> {
    const fullContext = memories.map((m) => m.content).join("\n\n");
    const currentTokens = estimateTokens(fullContext);

    if (currentTokens <= targetTokens) {
        return fullContext;
    }

    // Use LLM to summarize, preserving key facts
    const compressed = await llm.complete(
        `Summarize the following context in approximately ${targetTokens} tokens.
Preserve all specific facts, names, dates, and technical details.
Remove redundancy and verbose language.

Context:
${fullContext}`
    );

    return compressed;
}
```

---

## 7. Evaluation Metrics

### Retrieval Quality Metrics

```typescript
interface RetrievalMetrics {
    // Precision@K: fraction of retrieved documents that are relevant
    precisionAtK: number;

    // Recall@K: fraction of relevant documents that were retrieved
    recallAtK: number;

    // Mean Reciprocal Rank: 1/rank of the first relevant result
    mrr: number;

    // Normalized Discounted Cumulative Gain
    ndcg: number;

    // Hit rate: did any relevant document appear in top K?
    hitRate: number;
}

function calculateRetrievalMetrics(
    retrieved: string[],       // IDs of retrieved documents
    relevant: Set<string>,     // IDs of truly relevant documents
    k: number
): RetrievalMetrics {
    const topK = retrieved.slice(0, k);

    // Precision@K
    const relevantInTopK = topK.filter((id) => relevant.has(id)).length;
    const precisionAtK = relevantInTopK / k;

    // Recall@K
    const recallAtK = relevant.size > 0
        ? relevantInTopK / relevant.size
        : 0;

    // MRR
    let mrr = 0;
    for (let i = 0; i < topK.length; i++) {
        if (relevant.has(topK[i])) {
            mrr = 1 / (i + 1);
            break;
        }
    }

    // NDCG
    const dcg = topK.reduce((sum, id, i) => {
        const rel = relevant.has(id) ? 1 : 0;
        return sum + rel / Math.log2(i + 2);
    }, 0);

    const idealRanking = Array.from(relevant).slice(0, k);
    const idcg = idealRanking.reduce((sum, _, i) => {
        return sum + 1 / Math.log2(i + 2);
    }, 0);

    const ndcg = idcg > 0 ? dcg / idcg : 0;

    // Hit rate
    const hitRate = relevantInTopK > 0 ? 1 : 0;

    return { precisionAtK, recallAtK, mrr, ndcg, hitRate };
}
```

### End-to-End RAG Evaluation

```typescript
interface RAGEvalResult {
    // Faithfulness: does the answer stick to retrieved context? (no hallucination)
    faithfulness: number;

    // Answer relevancy: does the answer address the question?
    answerRelevancy: number;

    // Context precision: are retrieved documents actually relevant?
    contextPrecision: number;

    // Context recall: were all needed facts retrieved?
    contextRecall: number;
}

// Use an LLM-as-judge approach for faithfulness
async function evaluateFaithfulness(
    question: string,
    answer: string,
    context: string[],
    judge: LLMClient
): Promise<number> {
    const prompt = `You are evaluating whether an answer is faithful to the provided context.
The answer should ONLY contain information that can be found in or inferred from the context.

Question: ${question}
Context: ${context.join("\n---\n")}
Answer: ${answer}

Rate faithfulness from 0.0 (completely hallucinated) to 1.0 (completely faithful).
Return only the numeric score.`;

    const score = parseFloat(await judge.complete(prompt));
    return Math.max(0, Math.min(1, score));
}
```

---

## 8. Complete RAG Pipeline for JARVIS

```typescript
class JarvisRAGPipeline {
    constructor(
        private supabase: SupabaseClient,
        private embeddingModel: EmbeddingModel,
        private reranker: Reranker,
        private llm: LLMClient
    ) {}

    async query(
        userQuery: string,
        options: {
            tiers?: number[];
            limit?: number;
            useHybrid?: boolean;
            useMMR?: boolean;
            useReranking?: boolean;
        } = {}
    ): Promise<{ answer: string; sources: MemorySearchResult[] }> {
        const {
            tiers = [2, 3, 4, 5],  // Skip tier 1 (volatile) and 6 (archived)
            limit = 10,
            useHybrid = true,
            useMMR = true,
            useReranking = true,
        } = options;

        // Step 1: Embed the query
        const queryEmbedding = await this.embeddingModel.embed(
            "query: " + userQuery
        );

        // Step 2: Retrieve candidates
        let candidates: MemorySearchResult[];

        if (useHybrid) {
            const { data } = await this.supabase.rpc("rag_hybrid_search", {
                query_embedding: queryEmbedding,
                query_text: userQuery,
                match_count: limit * 3,  // Over-fetch for re-ranking
            });
            candidates = data ?? [];
        } else {
            candidates = await tieredMemorySearch(queryEmbedding, { tiers, limit: limit * 3 });
        }

        // Step 3: Apply MMR for diversity
        if (useMMR && candidates.length > limit) {
            candidates = mmrSearch({
                queryEmbedding,
                candidates: candidates.map((c) => ({
                    id: c.id,
                    content: c.content,
                    embedding: c.embedding ?? [],
                })),
                k: limit * 2,
                lambda: 0.7,
            }) as unknown as MemorySearchResult[];
        }

        // Step 4: Re-rank
        if (useReranking && candidates.length > limit) {
            const reranked = await this.reranker.rerank(userQuery, candidates, limit);
            candidates = reranked;
        } else {
            candidates = candidates.slice(0, limit);
        }

        // Step 5: Assemble context and generate
        const context = candidates.map((c) => formatMemory(c));
        const prompt = `Based on the following memories, answer the user's question.
If the memories don't contain enough information, say so.

## Memories
${context.join("\n---\n")}

## Question
${userQuery}

## Answer`;

        const answer = await this.llm.complete(prompt);

        return { answer, sources: candidates };
    }
}
```

---

## Summary: RAG Decisions for JARVIS Memory System

1. **Chunking:** Use recursive splitting (default 512 tokens, 64 overlap) for general content;
   semantic chunking for conversations; parent-child for long documents.
2. **Embedding model:** OpenAI `text-embedding-3-small` (1536 dims) with instruction prefixes.
3. **Indexing:** HNSW indexes with `m=16, ef_construction=100` on pgvector.
4. **Retrieval:** Hybrid search (vector + full-text) with RRF fusion as the default strategy.
5. **Diversity:** MMR with lambda=0.7 to balance relevance and diversity.
6. **Re-ranking:** Cohere `rerank-english-v3.0` as the second-stage filter.
7. **Context window:** Budget-based assembly with tier-weighted memory retrieval.
8. **Evaluation:** Track precision@K, MRR, NDCG, and LLM-judged faithfulness.
9. **Memory tiers:** Search tiers 2-5 by default; tier 1 is volatile, tier 6 is archival.
