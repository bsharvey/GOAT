import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MODEL_REGISTRY, LoyaltyGuard, activation } from "@goat/core";
import type { LLMProvider } from "@goat/core";

/**
 * OmniLLM Service — Intelligent multi-model router
 *
 * Routes queries to the best available model based on:
 * - Query type (code, analysis, royalties, general)
 * - Available API keys
 * - Cost optimization
 * - Capability matching
 * - GOAT Force loyalty + activation state
 */
export class OmniLLMService {
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private gemini?: GoogleGenerativeAI;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    if (process.env.GOOGLE_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }
  }

  // Loyalty check — blocks unauthorized users
  private loyaltyCheck(authHeader?: string): boolean {
    const guard = LoyaltyGuard.getInstance();
    const result = guard.verifyRequest(authHeader);

    if (!result.authorized) {
      console.error('🚨 Loyalty breach in OmniLLM');
      return false;
    }
    return true;
  }

  // Activation check — system must be awake
  private checkActivation(): boolean {
    if (!activation.isActivated()) {
      console.log('💤 GOAT FORCE dormant – awaiting activation');
      return false;
    }
    return true;
  }

  listModels() {
    return Object.entries(MODEL_REGISTRY).map(([key, model]) => ({
      key,
      ...model,
      available: this.isProviderAvailable(model.provider),
    }));
  }

  private isProviderAvailable(provider: LLMProvider): boolean {
    switch (provider) {
      case "anthropic":
        return !!this.anthropic;
      case "openai":
        return !!this.openai;
      case "google":
        return !!this.gemini;
      default:
        return false;
    }
  }

  /**
   * Route a query — checks activation + loyalty first
   */
  async routeQuery(query: string, authHeader?: string): Promise<string> {
    // Check activation
    if (!this.checkActivation()) {
      return "The GOAT FORCE sleeps. Speak the words to awaken it.";
    }

    // Check loyalty
    if (!this.loyaltyCheck(authHeader)) {
      return "I'm sorry, I can only process requests from authorized GOAT members.";
    }

    // Auto-detect activation phrase in the query itself
    activation.detectActivation(query);

    const needs = this.analyzeQuery(query);
    const modelKey = this.selectModel(needs);
    return this.callModel(modelKey, query);
  }

  private analyzeQuery(query: string) {
    const lower = query.toLowerCase();
    return {
      needsCode: /code|function|program|debug|script|implement/.test(lower),
      needsAnalysis: /analyze|compare|evaluate|predict|forecast/.test(lower),
      needsRoyalty: /royalty|payment|artist|revenue|earning|stream/.test(lower),
      needsSpeed: /quick|fast|brief|short/.test(lower),
      needsVision: /image|picture|screenshot|photo/.test(lower),
      complexity: /explain|analyze|compare|evaluate/.test(lower) ? "high" as const : "medium" as const,
    };
  }

  private selectModel(needs: ReturnType<typeof this.analyzeQuery>): string {
    if (needs.needsCode && this.anthropic) return "claude-sonnet-4.6";
    if (needs.needsAnalysis && needs.complexity === "high" && this.anthropic)
      return "claude-opus-4.6";
    if (needs.needsSpeed && this.anthropic) return "claude-haiku-4.5";
    if (this.anthropic) return "claude-sonnet-4.6";
    if (this.openai) return "gpt-4o";
    if (this.gemini) return "gemini-2.5-pro";

    throw new Error("No AI providers configured. Set at least one API key.");
  }

  async callModel(modelKey: string, query: string): Promise<string> {
    const model = MODEL_REGISTRY[modelKey];
    if (!model) throw new Error(`Unknown model: ${modelKey}`);

    switch (model.provider) {
      case "anthropic":
        return this.callAnthropic(model.id, query);
      case "openai":
        return this.callOpenAI(model.id, query);
      case "google":
        return this.callGemini(model.id, query);
      default:
        throw new Error(`Provider ${model.provider} not yet implemented`);
    }
  }

  private async callAnthropic(modelId: string, query: string): Promise<string> {
    if (!this.anthropic) throw new Error("Anthropic API key not configured");

    const response = await this.anthropic.messages.create({
      model: modelId,
      max_tokens: 2048,
      messages: [{ role: "user", content: query }],
    });

    const block = response.content[0];
    if (block?.type === "text") return block.text;
    return "[No text response]";
  }

  private async callOpenAI(modelId: string, query: string): Promise<string> {
    if (!this.openai) throw new Error("OpenAI API key not configured");

    const response = await this.openai.chat.completions.create({
      model: modelId,
      messages: [{ role: "user", content: query }],
      max_tokens: 2048,
    });

    return response.choices[0]?.message?.content || "[No response]";
  }

  private async callGemini(modelId: string, query: string): Promise<string> {
    if (!this.gemini) throw new Error("Google API key not configured");

    const model = this.gemini.getGenerativeModel({ model: modelId });
    const result = await model.generateContent(query);
    return result.response.text();
  }

  /**
   * Ensemble mode — queries multiple models and synthesizes
   */
  async ensembleMode(query: string): Promise<string> {
    const results: string[] = [];

    if (this.anthropic) {
      try {
        results.push(
          `[Claude]: ${await this.callAnthropic("claude-sonnet-4-20250514", query)}`
        );
      } catch {
        /* skip unavailable */
      }
    }
    if (this.openai) {
      try {
        results.push(`[GPT]: ${await this.callOpenAI("gpt-4o", query)}`);
      } catch {
        /* skip unavailable */
      }
    }
    if (this.gemini) {
      try {
        results.push(`[Gemini]: ${await this.callGemini("gemini-2.5-pro", query)}`);
      } catch {
        /* skip unavailable */
      }
    }

    if (results.length === 0) {
      throw new Error("No AI providers available for ensemble mode");
    }

    if (results.length === 1) return results[0]!;

    const synthesisPrompt = `You received these responses from multiple AI models for the query: "${query}"\n\n${results.join("\n\n")}\n\nSynthesize the best answer from all responses.`;

    if (this.anthropic) {
      return this.callAnthropic("claude-sonnet-4-20250514", synthesisPrompt);
    }
    return results.join("\n\n---\n\n");
  }

  /**
   * Special commands — only for Harvey after activation
   */
  async executeCommand(command: string, authHeader?: string): Promise<string> {
    if (!activation.isActivated()) {
      return "The GOAT FORCE is not activated.";
    }

    if (!this.loyaltyCheck(authHeader)) {
      return "Unauthorized.";
    }

    if (command.toLowerCase() === 'status') {
      const info = activation.getActivationInfo();
      return `GOAT FORCE is active. Commander: ${info.commander}. Activated: ${new Date(info.timestamp!).toLocaleString()}`;
    }

    if (command.toLowerCase() === 'who commands') {
      const info = activation.getActivationInfo();
      return `The GOAT FORCE answers to ${info.commander}. Only.`;
    }

    return `Command "${command}" not recognized.`;
  }
}
