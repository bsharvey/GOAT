---
archetypes: [karen, oranos]
skills: [observability, constitutional-validation]
training_cluster: 08-observability-evaluation-agent
domain: observability
difficulty: advanced
version: 1.0
---
# OpenTelemetry GenAI Semantic Conventions

> Training documentation for the JARVIS Observability/Evaluation Agent.
> Source: https://opentelemetry.io/docs/specs/semconv/gen-ai/ and https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai

---

## 1. Overview

The OpenTelemetry GenAI Semantic Conventions define a standardized set of attributes, span names, and metric names for instrumenting Generative AI / LLM operations. These conventions ensure consistent, vendor-neutral observability across different LLM providers (OpenAI, Anthropic, Google, Cohere, AWS Bedrock, etc.).

The conventions cover:
- **Client spans** for LLM API calls
- **Token usage** tracking
- **Model identification**
- **Prompt and completion** content capture
- **Metrics** for cost, latency, and usage

> **Status**: The GenAI semantic conventions are currently **experimental** (as of early 2026). Attribute names may change. The `gen_ai.*` namespace is the standard prefix.

---

## 2. GenAI Span Attributes

### 2.1 Request Attributes

These attributes describe the request sent to the GenAI model:

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `gen_ai.system` | string | **Required.** The GenAI product/system. | `openai`, `anthropic`, `az.ai.inference` |
| `gen_ai.request.model` | string | **Required.** The model requested. | `gpt-4`, `claude-sonnet-4-20250514`, `gemini-pro` |
| `gen_ai.request.max_tokens` | int | Max tokens to generate. | `4096` |
| `gen_ai.request.temperature` | float | Sampling temperature. | `0.7` |
| `gen_ai.request.top_p` | float | Nucleus sampling parameter. | `0.9` |
| `gen_ai.request.top_k` | int | Top-k sampling parameter. | `40` |
| `gen_ai.request.stop_sequences` | string[] | Stop sequences. | `["\n\n", "END"]` |
| `gen_ai.request.frequency_penalty` | float | Frequency penalty. | `0.5` |
| `gen_ai.request.presence_penalty` | float | Presence penalty. | `0.5` |
| `gen_ai.operation.name` | string | The GenAI operation being performed. | `chat`, `text_completion`, `embeddings` |

### 2.2 Response Attributes

These attributes describe the response from the GenAI model:

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `gen_ai.response.model` | string | The actual model that served the request. | `gpt-4-0613` |
| `gen_ai.response.id` | string | Provider-specific response identifier. | `chatcmpl-abc123` |
| `gen_ai.response.finish_reasons` | string[] | Reasons the model stopped generating. | `["stop"]`, `["length"]`, `["tool_calls"]` |

### 2.3 Token Usage Attributes

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `gen_ai.usage.input_tokens` | int | Number of tokens in the prompt/input. | `150` |
| `gen_ai.usage.output_tokens` | int | Number of tokens in the completion/output. | `500` |

### 2.4 System-Specific Values for `gen_ai.system`

| Value | Provider |
|-------|----------|
| `openai` | OpenAI |
| `anthropic` | Anthropic (Claude) |
| `vertex_ai` | Google Vertex AI |
| `az.ai.inference` | Azure AI Inference |
| `aws.bedrock` | AWS Bedrock |
| `cohere` | Cohere |

---

## 3. Span Naming Convention

The recommended span name format is:

```
{gen_ai.operation.name} {gen_ai.request.model}
```

Examples:
- `chat gpt-4`
- `chat claude-sonnet-4-20250514`
- `text_completion gpt-3.5-turbo`
- `embeddings text-embedding-ada-002`

---

## 4. Span Kind

GenAI client spans MUST use `SpanKind.CLIENT` since they represent outgoing requests to an external GenAI service.

---

## 5. Prompt and Completion Capture

### 5.1 Span Events for Messages

Prompt and completion content are captured as **span events**, not attributes (because they can be very large). This is an opt-in feature due to data sensitivity and size.

#### Prompt Event

Event name: `gen_ai.content.prompt`

| Attribute | Type | Description |
|-----------|------|-------------|
| `gen_ai.prompt` | string | The full prompt content (JSON-serialized for chat messages). |

#### Completion Event

Event name: `gen_ai.content.completion`

| Attribute | Type | Description |
|-----------|------|-------------|
| `gen_ai.completion` | string | The full completion content (JSON-serialized for chat messages). |

### 5.2 Chat Message Format

For chat-based models, prompt and completion content is serialized as JSON arrays:

```json
// gen_ai.prompt value
[
  {"role": "system", "content": "You are a helpful assistant."},
  {"role": "user", "content": "What is OpenTelemetry?"}
]

// gen_ai.completion value
[
  {"role": "assistant", "content": "OpenTelemetry is an observability framework..."}
]
```

### 5.3 Configuration for Content Capture

Content capture should be controlled by configuration since prompts/completions may contain PII or sensitive data:

```typescript
// Environment variable approach
// OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true

interface GenAIInstrumentationConfig {
  /** Whether to capture prompt and completion content as span events */
  captureMessageContent?: boolean; // default: false
}
```

---

## 6. Tool/Function Calling Attributes

When LLMs invoke tools or functions:

| Attribute | Type | Description |
|-----------|------|-------------|
| `gen_ai.tool.name` | string | Name of the tool/function called. |
| `gen_ai.tool.call_id` | string | Provider-specific tool call identifier. |

Tool calls appear in the completion content:

```json
[
  {
    "role": "assistant",
    "content": null,
    "tool_calls": [
      {
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "get_weather",
          "arguments": "{\"location\": \"San Francisco\"}"
        }
      }
    ]
  }
]
```

---

## 7. GenAI Metrics

### 7.1 Client Metrics

| Metric Name | Type | Unit | Description |
|-------------|------|------|-------------|
| `gen_ai.client.token.usage` | Histogram | `token` | Number of tokens used per request, with `gen_ai.token.type` attribute (`input` or `output`) |
| `gen_ai.client.operation.duration` | Histogram | `s` | Duration of the GenAI operation |

### 7.2 Metric Attributes

Metrics should carry these attributes for dimensional analysis:

```typescript
{
  'gen_ai.system': 'anthropic',
  'gen_ai.request.model': 'claude-sonnet-4-20250514',
  'gen_ai.operation.name': 'chat',
  'gen_ai.response.model': 'claude-sonnet-4-20250514',
  'gen_ai.token.type': 'input',  // or 'output'
  'server.address': 'api.anthropic.com',
  'server.port': 443,
  'error.type': 'rate_limit_exceeded', // only on errors
}
```

---

## 8. Implementation Example

### Full Instrumentation for an LLM Call

```typescript
import {
  trace,
  SpanKind,
  SpanStatusCode,
  context,
  Span,
} from '@opentelemetry/api';

const tracer = trace.getTracer('gen-ai-instrumentation', '0.1.0');

interface GenAIConfig {
  captureMessageContent: boolean;
}

const config: GenAIConfig = {
  captureMessageContent: process.env.OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT === 'true',
};

async function instrumentedLLMCall(
  messages: Array<{ role: string; content: string }>,
  model: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  } = {}
) {
  const spanName = `chat ${model}`;

  return tracer.startActiveSpan(spanName, {
    kind: SpanKind.CLIENT,
    attributes: {
      'gen_ai.system': 'anthropic',
      'gen_ai.operation.name': 'chat',
      'gen_ai.request.model': model,
      'gen_ai.request.max_tokens': options.maxTokens ?? 4096,
      'gen_ai.request.temperature': options.temperature ?? 1.0,
      ...(options.topP !== undefined && { 'gen_ai.request.top_p': options.topP }),
      ...(options.stopSequences && { 'gen_ai.request.stop_sequences': options.stopSequences }),
      'server.address': 'api.anthropic.com',
      'server.port': 443,
    },
  }, async (span: Span) => {
    // Optionally capture prompt content as a span event
    if (config.captureMessageContent) {
      span.addEvent('gen_ai.content.prompt', {
        'gen_ai.prompt': JSON.stringify(messages),
      });
    }

    const startTime = performance.now();

    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature,
        messages,
      });

      const duration = (performance.now() - startTime) / 1000;

      // Set response attributes
      span.setAttributes({
        'gen_ai.response.model': response.model,
        'gen_ai.response.id': response.id,
        'gen_ai.response.finish_reasons': [response.stop_reason],
        'gen_ai.usage.input_tokens': response.usage.input_tokens,
        'gen_ai.usage.output_tokens': response.usage.output_tokens,
      });

      // Optionally capture completion content
      if (config.captureMessageContent) {
        span.addEvent('gen_ai.content.completion', {
          'gen_ai.completion': JSON.stringify([
            { role: 'assistant', content: response.content[0].text },
          ]),
        });
      }

      // Record metrics
      tokenUsageHistogram.record(response.usage.input_tokens, {
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': model,
        'gen_ai.token.type': 'input',
        'gen_ai.operation.name': 'chat',
      });
      tokenUsageHistogram.record(response.usage.output_tokens, {
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': model,
        'gen_ai.token.type': 'output',
        'gen_ai.operation.name': 'chat',
      });
      durationHistogram.record(duration, {
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': model,
        'gen_ai.operation.name': 'chat',
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return response;
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);

      // Set error attributes
      span.setAttribute('error.type', error.type || error.constructor.name);

      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## 9. OpenAI Instrumentation Package

The `@traceloop/instrumentation-openai` and `@opentelemetry/instrumentation-openai` packages provide automatic instrumentation:

```typescript
import { OpenAIInstrumentation } from '@traceloop/instrumentation-openai';

const openaiInstrumentation = new OpenAIInstrumentation({
  captureMessageContent: true, // opt-in to content capture
});
```

---

## 10. Anthropic-Specific Patterns

For Anthropic Claude models, additional patterns apply:

```typescript
// Anthropic-specific attributes
span.setAttributes({
  'gen_ai.system': 'anthropic',
  'gen_ai.request.model': 'claude-sonnet-4-20250514',
  // Anthropic-specific: thinking/extended thinking
  'gen_ai.anthropic.thinking_budget_tokens': 10000,
  // Cache usage (Anthropic prompt caching)
  'gen_ai.anthropic.cache_creation_input_tokens': 1000,
  'gen_ai.anthropic.cache_read_input_tokens': 500,
});
```

---

## 11. Best Practices

1. **Always set `gen_ai.system` and `gen_ai.request.model`** - these are the minimum required attributes.
2. **Track token usage** - essential for cost monitoring and optimization.
3. **Use span events for content, not attributes** - prompts/completions can be very large.
4. **Default to NOT capturing content** - opt-in only, due to PII/sensitivity concerns.
5. **Record `gen_ai.response.finish_reasons`** - detect truncation (`length`) vs. normal completion (`stop`).
6. **Use the standard `gen_ai.*` namespace** - avoid vendor-specific attribute names where possible.
7. **Correlate with parent application spans** - embed LLM calls within broader operation traces.
8. **Track model version drift** - compare `gen_ai.request.model` vs. `gen_ai.response.model`.
9. **Monitor error rates by model and operation** - use metrics with dimensional attributes.
10. **Include `server.address`** - identifies which endpoint/provider is being used.
