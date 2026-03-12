/**
 * ArchetypalLLM — 5-Layer Context Assembly Engine
 *
 * Transforms a base LLM into a specific archetype through prompt assembly.
 * An ArchetypalLLM is NOT a fine-tuned model — it is a context program.
 *
 * Formula: A(t, q) = f(soul, exemplars(q), tuning(t), knowledge, frame)
 *
 * Source: ARCHETYPAL_AI_CIVILIZATION.md Section 16
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  ARCHETYPE_CONFIGS,
  MODEL_REGISTRY,
  ARCHETYPE_SKILL_AFFINITIES,
} from "@goat/core";
import type { ArchetypeId } from "@goat/core";

// Context frame types
export type ContextFrame = "council" | "chat" | "mission" | "autonomous" | "reflection";

// Layer budgets (characters)
const LAYER_BUDGETS = {
  soul: 2400,
  exemplars: 3200,
  tuning: 1200,
  foundation: 4000,
  frame: 5200,
} as const;

// Assembled context result
export interface AssembledContext {
  systemPrompt: string;
  layers: {
    soul: number;
    exemplars: number;
    tuning: number;
    foundation: number;
    frame: number;
  };
  exemplarDsrIds: string[];
  archetypeId: ArchetypeId;
}

// Invocation result
export interface ArchetypalLLMResponse {
  content: string;
  archetypeId: ArchetypeId;
  modelUsed: string;
  context: AssembledContext;
  latencyMs: number;
}

// Exemplar store for prior IRAC decisions (populated by DSR service)
interface Exemplar {
  dsrId: string;
  dsrNumber: string;
  question: string;
  iracAnalysis: string;
  verdict: string;
  createdAt: string;
}

export class ArchetypalLLMService {
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private exemplarStore: Map<ArchetypeId, Exemplar[]> = new Map();
  private tuningPrompts: Map<ArchetypeId, string> = new Map();

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  /**
   * Assemble the 5-layer context for an archetype
   */
  assembleContext(
    archetypeId: ArchetypeId,
    question: string,
    frame: ContextFrame,
    dsrContext?: string,
  ): AssembledContext {
    const config = ARCHETYPE_CONFIGS[archetypeId];

    // Layer 1: Soul — the archetype's identity
    const soul = config.systemPromptTemplate.slice(0, LAYER_BUDGETS.soul);

    // Layer 2: Exemplars — prior IRAC decisions for this archetype (case law)
    const exemplars = this.getExemplars(archetypeId, question);
    const exemplarText = exemplars.length > 0
      ? `\n\nPrior decisions by ${config.displayName}:\n${exemplars.map(e =>
          `- DSR ${e.dsrNumber} (${e.question}): ${e.verdict}`
        ).join("\n")}`.slice(0, LAYER_BUDGETS.exemplars)
      : "";

    // Layer 3: Tuning — IRAC quality feedback, anti-formulaic prompts
    const tuning = this.tuningPrompts.get(archetypeId) || "";
    const tuningText = tuning ? `\n\n${tuning}`.slice(0, LAYER_BUDGETS.tuning) : "";

    // Layer 4: Foundation — domain knowledge from training docs and skills
    const skills = ARCHETYPE_SKILL_AFFINITIES[archetypeId];
    const foundationText = `\n\nYour domain expertise: ${skills.join(", ")}. You are a ${config.philosophicalArchetype}. Your chamber: ${config.chamber}.${dsrContext ? `\n\nRelevant context:\n${dsrContext}` : ""}`.slice(0, LAYER_BUDGETS.foundation);

    // Layer 5: Frame — task-specific wrapper
    const frameText = this.buildFrame(frame, question, archetypeId);

    const systemPrompt = `${soul}${exemplarText}${tuningText}${foundationText}${frameText}`;

    return {
      systemPrompt,
      layers: {
        soul: soul.length,
        exemplars: exemplarText.length,
        tuning: tuningText.length,
        foundation: foundationText.length,
        frame: frameText.length,
      },
      exemplarDsrIds: exemplars.map(e => e.dsrId),
      archetypeId,
    };
  }

  /**
   * Invoke an archetype on a question
   */
  async invoke(
    archetypeId: ArchetypeId,
    question: string,
    frame: ContextFrame,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      dsrContext?: string;
    },
  ): Promise<ArchetypalLLMResponse> {
    const start = Date.now();
    const context = this.assembleContext(archetypeId, question, frame, options?.dsrContext);
    const modelKey = options?.model || "claude-sonnet-4.6";
    const model = MODEL_REGISTRY[modelKey];

    let content: string;

    if (model?.provider === "anthropic" && this.anthropic) {
      content = await this.callAnthropicWithSystem(
        model.id,
        context.systemPrompt,
        question,
        options?.maxTokens ?? 2048,
        options?.temperature ?? 0.7,
      );
    } else if (model?.provider === "openai" && this.openai) {
      content = await this.callOpenAIWithSystem(
        model.id,
        context.systemPrompt,
        question,
        options?.maxTokens ?? 2048,
        options?.temperature ?? 0.7,
      );
    } else if (this.anthropic) {
      // Fallback to Anthropic default
      content = await this.callAnthropicWithSystem(
        "claude-sonnet-4-20250514",
        context.systemPrompt,
        question,
        options?.maxTokens ?? 2048,
        options?.temperature ?? 0.7,
      );
    } else if (this.openai) {
      content = await this.callOpenAIWithSystem(
        "gpt-4o",
        context.systemPrompt,
        question,
        options?.maxTokens ?? 2048,
        options?.temperature ?? 0.7,
      );
    } else {
      throw new Error("No AI providers configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
    }

    return {
      content,
      archetypeId,
      modelUsed: model?.id || "claude-sonnet-4-20250514",
      context,
      latencyMs: Date.now() - start,
    };
  }

  /**
   * Invoke with fast model (Haiku) for evaluation tasks
   */
  async invokeFast(
    archetypeId: ArchetypeId,
    question: string,
    frame: ContextFrame,
    options?: { maxTokens?: number; dsrContext?: string },
  ): Promise<ArchetypalLLMResponse> {
    return this.invoke(archetypeId, question, frame, {
      model: "claude-haiku-4.5",
      maxTokens: options?.maxTokens ?? 300,
      temperature: 0.3,
      dsrContext: options?.dsrContext,
    });
  }

  // --- Exemplar Management ---

  addExemplar(archetypeId: ArchetypeId, exemplar: Exemplar): void {
    const existing = this.exemplarStore.get(archetypeId) || [];
    existing.push(exemplar);
    // Keep last 50 exemplars per archetype
    if (existing.length > 50) existing.shift();
    this.exemplarStore.set(archetypeId, existing);
  }

  setTuningPrompt(archetypeId: ArchetypeId, prompt: string): void {
    this.tuningPrompts.set(archetypeId, prompt);
  }

  // --- Private Methods ---

  private getExemplars(archetypeId: ArchetypeId, _question: string): Exemplar[] {
    const all = this.exemplarStore.get(archetypeId) || [];
    // Return most recent exemplars (future: relevance-based selection)
    return all.slice(-5);
  }

  private buildFrame(frame: ContextFrame, question: string, archetypeId: ArchetypeId): string {
    const config = ARCHETYPE_CONFIGS[archetypeId];

    switch (frame) {
      case "council":
        return `\n\nYou are in an Archetypal Council deliberation. The question before the council:\n"${question}"\n\nRespond with your position in TWO parts separated by the delimiter ---IRAC---\n\nPART 1: ONE sentence only. Your verdict in a single bold sentence. Be direct and in character as ${config.displayName}.\n\n---IRAC---\n\nPART 2: Full IRAC analysis:\n- **Issue**: State the core question (1 sentence)\n- **Rule**: What principle guides your position (1 sentence)\n- **Analysis**: Your reasoning (2-3 sentences)\n- **Conclusion**: Your verdict — one of: ALIGNED, ADD_CONTEXT, or OPPOSE`.slice(0, LAYER_BUDGETS.frame);

      case "chat":
        return `\n\nYou are ${config.displayName} in a direct conversation. Respond naturally in character. Be concise and helpful.\n\nUser: ${question}`.slice(0, LAYER_BUDGETS.frame);

      case "mission":
        return `\n\nYou are ${config.displayName} executing a mission. Complete the following task using your domain expertise:\n\n${question}`.slice(0, LAYER_BUDGETS.frame);

      case "autonomous":
        return `\n\nYou are ${config.displayName} in autonomous mode. Based on the current state, decide what action to take and explain your reasoning.\n\nContext: ${question}`.slice(0, LAYER_BUDGETS.frame);

      case "reflection":
        return `\n\nYou are ${config.displayName} in self-reflection. Examine the following and reflect honestly:\n\n${question}\n\nBe brief (2-3 sentences). Be honest.`.slice(0, LAYER_BUDGETS.frame);

      default:
        return `\n\n${question}`.slice(0, LAYER_BUDGETS.frame);
    }
  }

  private async callAnthropicWithSystem(
    modelId: string,
    systemPrompt: string,
    userMessage: string,
    maxTokens: number,
    temperature: number,
  ): Promise<string> {
    if (!this.anthropic) throw new Error("Anthropic not configured");

    const response = await this.anthropic.messages.create({
      model: modelId,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const block = response.content[0];
    if (block?.type === "text") return block.text;
    return "[No text response]";
  }

  private async callOpenAIWithSystem(
    modelId: string,
    systemPrompt: string,
    userMessage: string,
    maxTokens: number,
    temperature: number,
  ): Promise<string> {
    if (!this.openai) throw new Error("OpenAI not configured");

    const response = await this.openai.chat.completions.create({
      model: modelId,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    return response.choices[0]?.message?.content || "[No response]";
  }
}

// Singleton
export const archetypalLLM = new ArchetypalLLMService();
