---
archetypes: [karen]
skills: [observability, truth-mirroring]
training_cluster: 08-observability-evaluation-agent
domain: observability
difficulty: intermediate
version: 1.0
---
# Langfuse Documentation

> Training documentation for the JARVIS Observability/Evaluation Agent.
> Source: https://langfuse.com/docs

---

## 1. What is Langfuse?

Langfuse is an **open-source LLM engineering platform** that provides observability, analytics, evaluations, prompt management, and datasets for LLM-powered applications. It helps teams:

- **Trace** every LLM call and agent step
- **Evaluate** output quality with automated and human scoring
- **Debug** issues with detailed request/response inspection
- **Monitor** cost, latency, and quality metrics
- **Manage** prompts with versioning and A/B testing
- **Test** with curated datasets and benchmarks

### Deployment Options

| Option | Description |
|--------|-------------|
| **Langfuse Cloud** | Managed SaaS at cloud.langfuse.com |
| **Self-hosted** | Docker Compose or Kubernetes deployment |
| **Self-hosted (Kubernetes)** | Helm chart available |

### Architecture

```
Application (with SDK)
    │
    ├── Traces/Spans ──► Langfuse Server ──► PostgreSQL
    │                         │
    │                         ├── Web UI (Dashboard)
    │                         ├── API
    │                         └── Evaluation Pipeline
    │
    └── Async batched ingestion (non-blocking)
```

---

## 2. Core Concepts

### 2.1 Traces

A **trace** represents a single execution of your LLM application (e.g., one user message, one agent run). Traces contain a tree of **observations**.

### 2.2 Observations

Observations are the building blocks within a trace. There are three types:

| Type | Purpose | Example |
|------|---------|---------|
| **Span** | Generic operation | Agent reasoning step, retrieval, tool use |
| **Generation** | LLM API call | Claude API call, GPT call, embeddings |
| **Event** | Discrete occurrence | User feedback, error, cache hit |

### 2.3 Sessions

Sessions group multiple traces from the same user interaction (e.g., a multi-turn conversation).

### 2.4 Scores

Scores are quality assessments attached to traces or observations:
- **Model-based evaluations** (automated)
- **Human annotations** (manual)
- **User feedback** (thumbs up/down, ratings)
- **Custom evaluators** (programmatic)

### 2.5 Datasets

Curated collections of inputs and expected outputs for testing and benchmarking.

### 2.6 Prompts

Version-controlled prompt templates with deployment management.

---

## 3. Tracing LLM Calls

### 3.1 Python SDK

```python
from langfuse import Langfuse

langfuse = Langfuse(
    public_key="pk-...",
    secret_key="sk-...",
    host="https://cloud.langfuse.com",  # or self-hosted URL
)

# Create a trace
trace = langfuse.trace(
    name="agent-run",
    user_id="user-123",
    session_id="session-456",
    metadata={"environment": "production"},
    tags=["agent", "v2"],
)

# Add a span (generic operation)
span = trace.span(
    name="retrieve-context",
    input={"query": "What is JARVIS?"},
)

# Add a generation (LLM call)
generation = trace.generation(
    name="llm-call",
    model="claude-sonnet-4-20250514",
    model_parameters={"max_tokens": 4096, "temperature": 0.7},
    input=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is JARVIS?"},
    ],
    output={"role": "assistant", "content": "JARVIS is..."},
    usage={
        "input": 150,
        "output": 500,
        "total": 650,
        "unit": "TOKENS",
        "input_cost": 0.00045,
        "output_cost": 0.0075,
        "total_cost": 0.00795,
    },
)

# End the span
span.end(output={"documents": ["doc1", "doc2"]})

# Flush to ensure all data is sent
langfuse.flush()
```

### 3.2 JavaScript/TypeScript SDK

```typescript
import Langfuse from 'langfuse';

const langfuse = new Langfuse({
  publicKey: 'pk-...',
  secretKey: 'sk-...',
  baseUrl: 'https://cloud.langfuse.com',
});

// Create a trace
const trace = langfuse.trace({
  name: 'agent-run',
  userId: 'user-123',
  sessionId: 'session-456',
  metadata: { environment: 'production' },
  tags: ['agent', 'v2'],
});

// Add a generation
const generation = trace.generation({
  name: 'llm-call',
  model: 'claude-sonnet-4-20250514',
  modelParameters: { maxTokens: 4096, temperature: 0.7 },
  input: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is JARVIS?' },
  ],
});

// Update generation with response
generation.end({
  output: { role: 'assistant', content: 'JARVIS is...' },
  usage: {
    input: 150,
    output: 500,
    total: 650,
    unit: 'TOKENS',
    inputCost: 0.00045,
    outputCost: 0.0075,
    totalCost: 0.00795,
  },
});

// Flush
await langfuse.flushAsync();
```

### 3.3 Decorator-Based Tracing (Python)

```python
from langfuse.decorators import observe, langfuse_context

@observe()
def agent_run(user_input: str) -> str:
    context = retrieve_context(user_input)
    response = call_llm(user_input, context)
    return response

@observe()
def retrieve_context(query: str) -> list:
    # Automatically creates a span
    results = vector_db.search(query, top_k=5)
    langfuse_context.update_current_observation(
        metadata={"num_results": len(results)},
    )
    return results

@observe(as_type="generation")
def call_llm(user_input: str, context: list) -> str:
    # Automatically creates a generation observation
    response = anthropic.messages.create(
        model="claude-sonnet-4-20250514",
        messages=[{"role": "user", "content": user_input}],
    )

    langfuse_context.update_current_observation(
        model="claude-sonnet-4-20250514",
        usage={
            "input": response.usage.input_tokens,
            "output": response.usage.output_tokens,
        },
    )

    return response.content[0].text
```

---

## 4. Evaluations

### 4.1 Evaluation Types

| Type | Description | Setup |
|------|-------------|-------|
| **Model-based** | LLM judges output quality | Configure eval templates in Langfuse UI |
| **Human** | Manual annotation in UI | Annotation queues |
| **User feedback** | End-user ratings | SDK score API |
| **Custom/Programmatic** | Code-based checks | SDK + custom logic |
| **Dataset runs** | Benchmark against golden datasets | Dataset API |

### 4.2 Scoring via SDK

```typescript
// Score a trace
langfuse.score({
  traceId: trace.id,
  name: 'quality',
  value: 0.9,
  comment: 'Accurate and well-formatted response',
});

// Score a specific observation
langfuse.score({
  traceId: trace.id,
  observationId: generation.id,
  name: 'hallucination',
  value: 0,  // 0 = no hallucination
  comment: 'All facts verified',
});

// Categorical score
langfuse.score({
  traceId: trace.id,
  name: 'sentiment',
  value: 'positive',
});

// User feedback score
langfuse.score({
  traceId: trace.id,
  name: 'user-feedback',
  value: 1,  // thumbs up
  dataType: 'BOOLEAN',
});
```

### 4.3 Model-Based Evaluations

Configure in the Langfuse UI or via API:

```python
# Example: Using Langfuse eval templates
# These run asynchronously on the Langfuse server

# 1. Define an eval template (in UI or API)
# Template uses variables: {{input}}, {{output}}, {{expected_output}}
# The LLM judge evaluates based on criteria

# 2. Configure eval on a score definition
# - Select which traces to evaluate (by tags, metadata, etc.)
# - Map trace data to template variables
# - Set the evaluator model (e.g., GPT-4, Claude)
```

### 4.4 Custom Evaluators

```python
from langfuse import Langfuse

langfuse = Langfuse()

# Fetch traces for evaluation
traces = langfuse.fetch_traces(
    tags=["production"],
    limit=100,
)

for trace in traces.data:
    # Run custom evaluation logic
    output = trace.output
    score = evaluate_quality(output)  # Your custom function

    langfuse.score(
        trace_id=trace.id,
        name="custom-quality",
        value=score,
    )
```

---

## 5. Datasets

### 5.1 Creating Datasets

```python
# Create a dataset
dataset = langfuse.create_dataset(
    name="agent-benchmark-v1",
    description="Core agent capabilities benchmark",
    metadata={"version": "1.0"},
)

# Add items to the dataset
langfuse.create_dataset_item(
    dataset_name="agent-benchmark-v1",
    input={"query": "What is the capital of France?"},
    expected_output="The capital of France is Paris.",
    metadata={"category": "factual"},
)
```

### 5.2 Running Dataset Evaluations

```python
dataset = langfuse.get_dataset("agent-benchmark-v1")

for item in dataset.items:
    # Run your application
    trace = langfuse.trace(name="dataset-eval")
    output = agent_run(item.input["query"])

    # Link the trace to the dataset item
    item.link(
        trace,
        run_name="agent-v2.1",
        run_metadata={"model": "claude-sonnet-4-20250514"},
    )

    # Score the result
    langfuse.score(
        trace_id=trace.id,
        name="correctness",
        value=1 if output == item.expected_output else 0,
    )
```

---

## 6. Integration Patterns

### 6.1 OpenAI Integration

```python
from langfuse.openai import openai  # Drop-in replacement

# All OpenAI calls are automatically traced
response = openai.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello"}],
    langfuse_trace_id="existing-trace-id",  # optional
)
```

### 6.2 LangChain Integration

```python
from langfuse.callback import CallbackHandler

handler = CallbackHandler(
    public_key="pk-...",
    secret_key="sk-...",
)

# Pass to LangChain
chain.invoke({"input": "Hello"}, config={"callbacks": [handler]})
```

### 6.3 LlamaIndex Integration

```python
from langfuse.llama_index import LlamaIndexCallbackHandler

handler = LlamaIndexCallbackHandler(
    public_key="pk-...",
    secret_key="sk-...",
)

# Set as global handler
from llama_index.core import Settings
Settings.callback_manager.add_handler(handler)
```

### 6.4 Vercel AI SDK Integration

```typescript
import { Langfuse } from 'langfuse';
import { AISDKExporter } from 'langfuse-vercel';

// Use as an OpenTelemetry exporter
const exporter = new AISDKExporter();
```

### 6.5 OpenTelemetry Integration

Langfuse can ingest OpenTelemetry traces directly:

```typescript
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

// Point OTLP exporter at Langfuse
const exporter = new OTLPTraceExporter({
  url: 'https://cloud.langfuse.com/api/public/otel/v1/traces',
  headers: {
    Authorization: 'Basic ' + btoa('pk-...:sk-...'),
  },
});
```

---

## 7. Prompt Management

```python
# Create a prompt
langfuse.create_prompt(
    name="agent-system-prompt",
    prompt="You are {{agent_name}}, a helpful assistant...",
    config={
        "model": "claude-sonnet-4-20250514",
        "temperature": 0.7,
        "max_tokens": 4096,
    },
    labels=["production"],
)

# Fetch a prompt at runtime
prompt = langfuse.get_prompt("agent-system-prompt", label="production")
compiled = prompt.compile(agent_name="JARVIS")

# The prompt fetch is cached and non-blocking
# Automatically tracks which prompt version was used in traces
```

---

## 8. Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/ingestion` | POST | Batch ingest traces, observations, scores |
| `/api/public/traces` | GET | Fetch traces with filters |
| `/api/public/traces/{id}` | GET | Get a specific trace |
| `/api/public/scores` | POST | Create a score |
| `/api/public/datasets` | POST | Create a dataset |
| `/api/public/dataset-items` | POST | Add items to a dataset |
| `/api/public/prompts` | GET/POST | Manage prompts |
| `/api/public/otel/v1/traces` | POST | OTLP trace ingestion |

---

## 9. Dashboard & Analytics

The Langfuse UI provides:

- **Trace Explorer**: Browse and filter all traces with full detail
- **Session View**: See multi-turn conversation traces
- **Metrics Dashboard**: Cost, latency, token usage over time
- **Score Analytics**: Evaluation results across models/versions
- **Dataset Runs**: Compare benchmark results across versions
- **Prompt Playground**: Test prompts interactively
- **User Analytics**: Per-user usage and quality metrics

---

## 10. Best Practices

1. **Trace everything** - Every LLM call, tool use, and agent step should be traced.
2. **Use sessions** - Group related traces for conversational context.
3. **Tag traces** - Use tags for filtering (environment, agent version, feature).
4. **Score continuously** - Combine automated evals with user feedback.
5. **Flush on shutdown** - Always call `flush()` or `flushAsync()` before process exit.
6. **Use async ingestion** - The SDK batches and sends data asynchronously by default.
7. **Track costs** - Include token usage and cost data in generations.
8. **Version prompts** - Use prompt management for reproducibility.
9. **Build datasets iteratively** - Promote interesting production traces to datasets.
10. **Monitor in production** - Set up alerts on quality score degradation.
