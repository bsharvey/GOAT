---
archetypes: [karen]
skills: [observability, pattern-memory]
training_cluster: 08-observability-evaluation-agent
domain: observability
difficulty: intermediate
version: 1.0
---
# Langfuse Tracing Guide

> Training documentation for the JARVIS Observability/Evaluation Agent.
> Source: https://langfuse.com/docs/tracing

---

## 1. Tracing Overview

Langfuse tracing captures the full execution flow of LLM applications as hierarchical trees of observations. Every trace represents one end-to-end execution (e.g., an API request, an agent run, a user message).

### Trace Hierarchy

```
Trace (top-level: one per request/interaction)
├── Span: "agent-planning"
│   ├── Generation: "llm-call-plan" (Claude API call)
│   └── Span: "tool-selection"
├── Span: "tool-execution"
│   ├── Span: "web-search"
│   │   └── Generation: "search-query-generation"
│   └── Span: "code-execution"
├── Generation: "llm-call-synthesize" (Final response generation)
└── Event: "user-feedback-received"
```

---

## 2. Trace Object

A trace is the root container for all observations in a single execution.

### Trace Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Auto-generated | Unique trace identifier |
| `name` | string | Recommended | Descriptive name for the trace |
| `input` | any | Optional | The input to the traced operation |
| `output` | any | Optional | The output of the traced operation |
| `userId` | string | Optional | User who triggered the trace |
| `sessionId` | string | Optional | Session grouping identifier |
| `metadata` | object | Optional | Arbitrary metadata |
| `tags` | string[] | Optional | Tags for filtering |
| `version` | string | Optional | Application version |
| `release` | string | Optional | Release identifier |
| `public` | boolean | Optional | Whether trace is publicly accessible |

### Creating Traces

```typescript
// JavaScript/TypeScript SDK
const trace = langfuse.trace({
  name: 'jarvis-agent-run',
  input: { userMessage: 'Deploy the new version' },
  userId: 'user-123',
  sessionId: 'session-456',
  metadata: {
    environment: 'production',
    agentVersion: '2.1.0',
    region: 'us-east-1',
  },
  tags: ['agent', 'production', 'deploy-task'],
  version: '2.1.0',
});

// Update trace later with output
trace.update({
  output: { response: 'Deployment completed successfully', status: 'success' },
});
```

```python
# Python SDK
trace = langfuse.trace(
    name="jarvis-agent-run",
    input={"user_message": "Deploy the new version"},
    user_id="user-123",
    session_id="session-456",
    metadata={
        "environment": "production",
        "agent_version": "2.1.0",
    },
    tags=["agent", "production"],
)
```

---

## 3. Observation Types

### 3.1 Spans

Spans represent generic operations or steps in your application. Use spans for non-LLM operations like retrieval, tool execution, processing steps, etc.

```typescript
// Create a span as a child of the trace
const retrievalSpan = trace.span({
  name: 'context-retrieval',
  input: { query: 'deployment procedures' },
  metadata: { source: 'vector-db' },
});

// Nest spans for sub-operations
const embeddingSpan = retrievalSpan.span({
  name: 'generate-embedding',
  input: { text: 'deployment procedures' },
});
embeddingSpan.end({
  output: { dimensions: 1536, model: 'text-embedding-3-small' },
});

const searchSpan = retrievalSpan.span({
  name: 'vector-search',
  input: { topK: 5 },
});
searchSpan.end({
  output: { numResults: 5, relevanceScores: [0.95, 0.91, 0.87, 0.82, 0.78] },
});

// End parent span
retrievalSpan.end({
  output: { documents: ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'] },
});
```

### Span Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Operation name |
| `input` | any | Input to the operation |
| `output` | any | Output of the operation |
| `metadata` | object | Arbitrary metadata |
| `level` | string | `DEBUG`, `DEFAULT`, `WARNING`, `ERROR` |
| `statusMessage` | string | Status description (especially for errors) |
| `startTime` | Date | When the span started |
| `endTime` | Date | When the span ended |
| `version` | string | Version of the code running this span |

### 3.2 Generations

Generations are specialized observations for LLM API calls. They track model, parameters, token usage, and cost.

```typescript
// Create a generation
const generation = trace.generation({
  name: 'plan-generation',
  model: 'claude-sonnet-4-20250514',
  modelParameters: {
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
  },
  input: [
    { role: 'system', content: 'You are JARVIS, an infrastructure agent...' },
    { role: 'user', content: 'Deploy the new version to staging' },
  ],
  metadata: {
    promptName: 'agent-planning-v3',
    promptVersion: 7,
  },
});

// After LLM responds, end with output and usage
generation.end({
  output: {
    role: 'assistant',
    content: 'I will execute the following deployment plan...',
  },
  usage: {
    input: 350,
    output: 800,
    total: 1150,
    unit: 'TOKENS',
    inputCost: 0.00105,   // in USD
    outputCost: 0.012,
    totalCost: 0.01305,
  },
  level: 'DEFAULT',
});
```

### Generation Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Name of the generation |
| `model` | string | Model identifier (e.g., `claude-sonnet-4-20250514`) |
| `modelParameters` | object | Model configuration (temperature, maxTokens, etc.) |
| `input` | any | Prompt / messages sent to the model |
| `output` | any | Model response |
| `usage` | object | Token usage and cost |
| `metadata` | object | Additional metadata |
| `completionStartTime` | Date | When first token was received (for TTFT) |
| `level` | string | Log level |
| `statusMessage` | string | Status description |
| `promptName` | string | Linked Langfuse prompt name |
| `promptVersion` | number | Linked Langfuse prompt version |

### Usage Object

```typescript
interface Usage {
  input?: number;           // Input tokens
  output?: number;          // Output tokens
  total?: number;           // Total tokens
  unit?: 'TOKENS' | 'CHARACTERS' | 'MILLISECONDS' | 'SECONDS' | 'IMAGES' | 'REQUESTS';
  inputCost?: number;       // Cost for input (USD)
  outputCost?: number;      // Cost for output (USD)
  totalCost?: number;       // Total cost (USD)
}
```

### 3.3 Events

Events are discrete, timestamped occurrences within a trace. They do not have a duration.

```typescript
// Log an event
trace.event({
  name: 'cache-hit',
  input: { key: 'deployment-plan:staging' },
  metadata: { cacheType: 'redis', ttl: 3600 },
});

// Error event
trace.event({
  name: 'tool-error',
  level: 'ERROR',
  statusMessage: 'Failed to connect to deployment target',
  input: { tool: 'ssh-deploy', target: 'staging-01' },
  metadata: { errorCode: 'ECONNREFUSED', retryCount: 3 },
});

// User interaction event
trace.event({
  name: 'user-approval',
  input: { action: 'deploy-to-production', approved: true },
  metadata: { approver: 'user-123', approvalTime: Date.now() },
});
```

---

## 4. Nesting Observations

Observations can be nested to create rich hierarchical traces:

```typescript
const trace = langfuse.trace({ name: 'agent-run' });

// Level 1: Planning phase
const planSpan = trace.span({ name: 'planning' });

  // Level 2: LLM call within planning
  const planGeneration = planSpan.generation({
    name: 'generate-plan',
    model: 'claude-sonnet-4-20250514',
    input: messages,
  });
  planGeneration.end({ output: planResponse, usage: planUsage });

planSpan.end();

// Level 1: Execution phase
const execSpan = trace.span({ name: 'execution' });

  // Level 2: Tool calls within execution
  for (const step of plan.steps) {
    const toolSpan = execSpan.span({
      name: `tool:${step.toolName}`,
      input: step.args,
    });

      // Level 3: Sub-operations within tool
      if (step.requiresLLM) {
        const toolGen = toolSpan.generation({
          name: 'tool-llm-call',
          model: 'claude-haiku-4-20250514',
          input: step.llmPrompt,
        });
        toolGen.end({ output: toolLLMResult, usage: toolUsage });
      }

    toolSpan.end({ output: step.result });
  }

execSpan.end();

// Level 1: Synthesis
const synthGen = trace.generation({
  name: 'synthesize-response',
  model: 'claude-sonnet-4-20250514',
  input: synthesisMessages,
});
synthGen.end({ output: finalResponse, usage: synthUsage });

trace.update({ output: finalResponse });
```

---

## 5. Linking Traces with IDs

You can use custom IDs to link traces and observations:

```typescript
// Use your own trace ID (e.g., from your request ID)
const trace = langfuse.trace({
  id: 'req-abc-123',  // Your custom ID
  name: 'agent-run',
});

// Use custom observation IDs
const span = trace.span({
  id: 'span-custom-id',
  name: 'retrieval',
});

// Reference parent by ID (for distributed tracing)
const childSpan = trace.span({
  name: 'sub-operation',
  parentObservationId: 'span-custom-id',
});
```

---

## 6. Metadata Patterns

### 6.1 Structured Metadata

```typescript
trace.update({
  metadata: {
    // Infrastructure context
    agent: 'jarvis-observability',
    agentVersion: '2.1.0',
    environment: 'production',
    region: 'us-east-1',

    // Request context
    requestId: 'req-abc-123',
    correlationId: 'corr-xyz-789',

    // Feature flags
    features: {
      useCache: true,
      streamingEnabled: true,
      evaluationEnabled: true,
    },

    // Performance hints
    expectedLatency: 'low',
    priority: 'high',
  },
});
```

### 6.2 Tagging Strategy

```typescript
// Environment tags
tags: ['production', 'us-east-1'],

// Feature/capability tags
tags: ['agent', 'tool-use', 'code-generation'],

// Quality tags (added after evaluation)
tags: ['evaluated', 'high-quality'],

// Debug tags
tags: ['debug', 'slow-response', 'retry'],
```

---

## 7. User Feedback Integration

### 7.1 Direct Score API

```typescript
// After user provides feedback on the response
async function recordUserFeedback(traceId: string, feedback: {
  rating: number;  // 1-5
  comment?: string;
  thumbsUp?: boolean;
}) {
  // Numeric rating
  langfuse.score({
    traceId,
    name: 'user-rating',
    value: feedback.rating,
    comment: feedback.comment,
  });

  // Boolean feedback
  if (feedback.thumbsUp !== undefined) {
    langfuse.score({
      traceId,
      name: 'user-thumbs',
      value: feedback.thumbsUp ? 1 : 0,
      dataType: 'BOOLEAN',
    });
  }

  await langfuse.flushAsync();
}
```

### 7.2 Feedback via API Endpoint

```typescript
// Example Express endpoint for collecting feedback
app.post('/api/feedback', async (req, res) => {
  const { traceId, score, comment } = req.body;

  langfuse.score({
    traceId,
    name: 'user-feedback',
    value: score,
    comment,
  });

  await langfuse.flushAsync();
  res.json({ success: true });
});
```

### 7.3 Implicit Feedback

```typescript
// Track implicit signals as scores
function trackImplicitFeedback(traceId: string) {
  // User copied the response
  langfuse.score({
    traceId,
    name: 'user-copied',
    value: 1,
    dataType: 'BOOLEAN',
  });

  // User regenerated (negative signal)
  langfuse.score({
    traceId,
    name: 'user-regenerated',
    value: 1,
    dataType: 'BOOLEAN',
    comment: 'User requested regeneration',
  });
}
```

---

## 8. Async & Batched Ingestion

The Langfuse SDK handles ingestion asynchronously and batches events:

```typescript
const langfuse = new Langfuse({
  publicKey: 'pk-...',
  secretKey: 'sk-...',
  baseUrl: 'https://cloud.langfuse.com',

  // Batching configuration
  flushAt: 15,          // Flush after 15 events
  flushInterval: 5000,  // Or every 5 seconds, whichever comes first

  // Request configuration
  requestTimeout: 10000,
  fetchRetryCount: 3,
  fetchRetryDelay: 1000,
});

// IMPORTANT: Always flush before process exits
process.on('beforeExit', async () => {
  await langfuse.shutdownAsync();
});

// For serverless (Cloudflare Workers, Lambda, etc.)
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const langfuse = new Langfuse({ /* config */ });

    // ... trace operations ...

    // Use waitUntil to flush after response is sent
    ctx.waitUntil(langfuse.flushAsync());

    return new Response('OK');
  },
};
```

---

## 9. Distributed Tracing

### 9.1 Passing Trace Context Between Services

```typescript
// Service A: Create trace and pass IDs
const trace = langfuse.trace({ name: 'service-a' });
const span = trace.span({ name: 'call-service-b' });

// Pass trace context in headers
const response = await fetch('https://service-b.example.com/api', {
  headers: {
    'x-langfuse-trace-id': trace.id,
    'x-langfuse-parent-observation-id': span.id,
  },
});
span.end();

// Service B: Continue the trace
app.post('/api', (req, res) => {
  const traceId = req.headers['x-langfuse-trace-id'];
  const parentId = req.headers['x-langfuse-parent-observation-id'];

  // Create observations linked to the existing trace
  const span = langfuse.span({
    traceId,
    parentObservationId: parentId,
    name: 'service-b-handler',
  });
  // ... process ...
  span.end();
});
```

---

## 10. Tracing Patterns for Agents

### 10.1 ReAct Agent Pattern

```typescript
async function traceReActAgent(userInput: string) {
  const trace = langfuse.trace({
    name: 'react-agent',
    input: { userInput },
    tags: ['agent', 'react'],
  });

  let iteration = 0;
  let finalAnswer: string | null = null;

  while (!finalAnswer && iteration < 10) {
    iteration++;

    const stepSpan = trace.span({
      name: `step-${iteration}`,
      metadata: { iteration },
    });

    // Thought: LLM reasons about next action
    const thoughtGen = stepSpan.generation({
      name: 'thought',
      model: 'claude-sonnet-4-20250514',
      input: buildPrompt(userInput, history),
    });
    const thought = await callLLM(buildPrompt(userInput, history));
    thoughtGen.end({ output: thought.text, usage: thought.usage });

    if (thought.isFinalAnswer) {
      finalAnswer = thought.answer;
      stepSpan.end({ output: { type: 'final-answer', answer: finalAnswer } });
      break;
    }

    // Action: Execute tool
    const actionSpan = stepSpan.span({
      name: `action:${thought.toolName}`,
      input: thought.toolArgs,
    });
    const result = await executeTool(thought.toolName, thought.toolArgs);
    actionSpan.end({ output: result });

    // Observation: Add result to history
    history.push({ thought: thought.text, action: thought.toolName, result });

    stepSpan.end({ output: { type: 'continue', tool: thought.toolName } });
  }

  trace.update({
    output: { answer: finalAnswer, iterations: iteration },
  });

  return finalAnswer;
}
```

### 10.2 Multi-Agent Pattern

```typescript
async function traceMultiAgentWorkflow(task: string) {
  const trace = langfuse.trace({
    name: 'multi-agent-workflow',
    input: { task },
    tags: ['multi-agent'],
  });

  // Orchestrator decides which agents to invoke
  const orchestratorSpan = trace.span({ name: 'orchestrator' });
  const plan = await planExecution(orchestratorSpan, task);
  orchestratorSpan.end({ output: plan });

  // Execute each agent as a child span
  for (const agentTask of plan.tasks) {
    const agentSpan = trace.span({
      name: `agent:${agentTask.agentName}`,
      input: agentTask.input,
      metadata: { agentType: agentTask.agentName },
    });

    const agentResult = await executeAgent(agentSpan, agentTask);

    agentSpan.end({
      output: agentResult,
      level: agentResult.success ? 'DEFAULT' : 'ERROR',
      statusMessage: agentResult.success ? undefined : agentResult.error,
    });
  }

  trace.update({ output: { status: 'complete' } });
}
```

---

## 11. Error Handling in Traces

```typescript
async function tracedOperation(trace: LangfuseTraceClient) {
  const span = trace.span({ name: 'risky-operation' });

  try {
    const result = await riskyOperation();
    span.end({ output: result, level: 'DEFAULT' });
    return result;
  } catch (error) {
    // Log the error in the span
    span.end({
      level: 'ERROR',
      statusMessage: error.message,
      output: {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
      },
    });

    // Also create an error event for visibility
    trace.event({
      name: 'error',
      level: 'ERROR',
      statusMessage: error.message,
      metadata: {
        errorType: error.constructor.name,
        stack: error.stack,
      },
    });

    throw error;
  }
}
```

---

## 12. Best Practices

1. **Name traces and spans descriptively** - Use consistent naming like `agent:planning`, `tool:web-search`, `llm:summarize`.
2. **Always include `input` and `output`** - Makes debugging much easier.
3. **Use `level` to flag issues** - Set `ERROR` or `WARNING` levels for problematic observations.
4. **Track `completionStartTime`** for TTFT (time to first token) metrics on generations.
5. **Include `usage` on every generation** - Essential for cost tracking and optimization.
6. **Use `sessionId` for conversations** - Groups multi-turn interactions.
7. **Add `userId` for per-user analytics** - Enables user-level quality monitoring.
8. **Flush before process exit** - Especially critical in serverless environments.
9. **Use metadata for debugging context** - Include request IDs, feature flags, version info.
10. **Keep observation trees shallow** - Deep nesting (>5 levels) makes traces hard to read.
