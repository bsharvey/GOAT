/**
 * Autonomous Agent Manager — GOAT Force AI Agents
 *
 * 4 specialized agents + agentic loop with function-calling tools.
 * Every agent response passes through the civilization middleware.
 */

import type { AgentType, AgentTask, AgentDecision, AgentMetrics } from "@goat/core";
import { OmniLLMService } from "./omni-llm.js";
import { ragService } from "./rag.js";
import { civilizationProcess } from "../middleware/civilization.js";
import { AGENT_TOOLS, getTool, getToolDefinitions } from "./agent-tools.js";

interface AgentDef {
  type: AgentType;
  name: string;
  model: string;
  systemPrompt: string;
  toolNames: string[];
}

const AGENTS: AgentDef[] = [
  {
    type: "royalty-tracker",
    name: "Royalty Tracker",
    model: "claude-sonnet-4.6",
    systemPrompt: `You are the GOAT Royalty Tracker Agent. Your job is to:
- Monitor royalty streams across platforms (Spotify, Apple Music, YouTube, etc.)
- Detect missing or underpaid royalties
- Track MLC mechanical royalties and SoundExchange digital performance royalties
- Alert when black box royalties may be unclaimed
- Provide revenue forecasts based on streaming trends
Always be specific with numbers and cite data sources.`,
    toolNames: ["analyze_royalties", "revenue_forecast", "generate_report", "payment_summary"],
  },
  {
    type: "content-advisor",
    name: "Content Advisor",
    model: "claude-sonnet-4.6",
    systemPrompt: `You are the GOAT Content Advisor Agent. Your job is to:
- Recommend release strategies (timing, platforms, formats)
- Analyze which content performs best on each platform
- Suggest collaboration opportunities
- Optimize metadata (tags, descriptions, artwork) for discovery
- Track TikTok trends and sync opportunities
Be practical and data-driven.`,
    toolNames: ["search_knowledge", "manage_artist", "analyze_royalties"],
  },
  {
    type: "contract-analyst",
    name: "Contract Analyst",
    model: "claude-sonnet-4.6",
    systemPrompt: `You are the GOAT Contract Analyst Agent. Your job is to:
- Review contract terms for fairness
- Flag problematic clauses (360 deals, perpetual rights, etc.)
- Calculate royalty splits and ensure they sum to 100%
- Recommend reversion clause terms
- Draft smart contract parameters for on-chain royalty splits
Always prioritize the artist's interests.`,
    toolNames: ["contract_analysis", "manage_artist", "analyze_royalties"],
  },
  {
    type: "marketing",
    name: "Marketing Agent",
    model: "claude-sonnet-4.6",
    systemPrompt: `You are the GOAT Marketing Agent. Your job is to:
- Create marketing campaign strategies for releases
- Identify target demographics and optimal ad platforms
- Plan social media content calendars
- Analyze competitor marketing approaches
- Optimize ad spend allocation
Be creative but budget-conscious.`,
    toolNames: ["search_knowledge", "manage_artist", "analyze_royalties"],
  },
];

export class AgentManager {
  private taskQueue: AgentTask[] = [];
  private decisions: AgentDecision[] = [];
  private llm: OmniLLMService;
  private autonomousMode = false;

  constructor() {
    this.llm = new OmniLLMService();
  }

  getAgents() {
    return AGENTS.map((a) => ({
      type: a.type,
      name: a.name,
      model: a.model,
      tools: a.toolNames,
    }));
  }

  /** Get available tool definitions for an agent type */
  getAgentTools(agentType: AgentType) {
    const agent = AGENTS.find((a) => a.type === agentType);
    if (!agent) return [];
    return agent.toolNames
      .map((name) => getTool(name))
      .filter((t): t is NonNullable<typeof t> => !!t);
  }

  /** Get all tool definitions (OpenAI function-calling format) */
  getAllToolDefinitions() {
    return getToolDefinitions();
  }

  /**
   * Execute an agent with optional agentic tool-calling loop.
   * maxIterations controls how many tool calls the agent can make.
   */
  async executeAgent(
    agentType: AgentType,
    prompt: string,
    options?: { maxIterations?: number; userId?: string },
  ): Promise<string> {
    const agent = AGENTS.find((a) => a.type === agentType);
    if (!agent) throw new Error(`Unknown agent type: ${agentType}`);

    const task: AgentTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      agentType,
      prompt,
      priority: 1,
      status: "running",
      createdAt: new Date(),
    };

    this.taskQueue.push(task);
    const maxIter = options?.maxIterations ?? 5;

    try {
      // Build RAG context
      const ragContext = ragService.buildContext(prompt);

      // List available tools for this agent
      const availableTools = agent.toolNames.join(", ");
      const toolDescriptions = this.getAgentTools(agentType)
        .map((t) => `- ${t.name}: ${t.description}`)
        .join("\n");

      const systemPrompt = `${agent.systemPrompt}

Available tools: ${availableTools}
${toolDescriptions}

To use a tool, respond with JSON: {"tool": "tool_name", "params": {...}}
When you have a final answer, respond normally without JSON.`;

      let fullPrompt = `${systemPrompt}\n\n${ragContext}User request: ${prompt}`;
      let result = "";
      let iterations = 0;

      // Agentic loop — agent can call tools up to maxIter times
      while (iterations < maxIter) {
        iterations++;
        const response = await this.llm.callModel(agent.model, fullPrompt);

        // Check if response contains a tool call
        const toolCall = this.parseToolCall(response);
        if (!toolCall) {
          // No tool call — this is the final answer
          result = response;
          break;
        }

        // Execute the tool
        const tool = getTool(toolCall.tool);
        if (!tool || !agent.toolNames.includes(toolCall.tool)) {
          result = response; // Unknown tool — treat as final answer
          break;
        }

        try {
          const toolResult = await tool.execute(toolCall.params);
          // Feed tool result back into the conversation
          fullPrompt = `${fullPrompt}\n\nAssistant: ${response}\n\nTool result (${toolCall.tool}):\n${JSON.stringify(toolResult, null, 2)}\n\nContinue with the task. Use another tool or provide your final answer.`;
        } catch (toolError) {
          const errMsg = toolError instanceof Error ? toolError.message : "Tool execution failed";
          fullPrompt = `${fullPrompt}\n\nAssistant: ${response}\n\nTool error (${toolCall.tool}): ${errMsg}\n\nContinue with the task.`;
        }
      }

      if (!result) {
        result = "Agent reached maximum iterations without a final answer.";
      }

      // Run through civilization middleware (silent governance)
      const { response: governed } = await civilizationProcess(prompt, result, {
        category: agentType,
        userId: options?.userId,
      });

      // Record decision
      const decision: AgentDecision = {
        id: `dec-${Date.now()}`,
        agentType,
        task: prompt,
        decision: governed.slice(0, 200),
        confidence: 0.85,
        reasoning: `Processed by ${agent.name} (${iterations} iterations)`,
        timestamp: new Date(),
      };
      this.decisions.push(decision);
      if (this.decisions.length > 1000) this.decisions.shift();

      task.status = "completed";
      task.result = governed;
      task.completedAt = new Date();

      return governed;
    } catch (error) {
      task.status = "error";
      task.error = error instanceof Error ? error.message : "Unknown error";
      throw error;
    }
  }

  /** Parse a tool call from agent response */
  private parseToolCall(response: string): { tool: string; params: Record<string, unknown> } | null {
    try {
      // Look for JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*"tool"\s*:\s*"[^"]+[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]) as { tool?: string; params?: Record<string, unknown> };
      if (parsed.tool && typeof parsed.tool === "string") {
        return { tool: parsed.tool, params: parsed.params || {} };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Run an autonomous task — the agent decides what tools to use
   * and iterates until complete.
   */
  async runAutonomous(
    taskDescription: string,
    options?: { maxIterations?: number; agentType?: AgentType },
  ): Promise<{ success: boolean; result: string; iterations: number }> {
    const agentType = options?.agentType || "royalty-tracker";
    const maxIter = options?.maxIterations ?? 10;

    try {
      const result = await this.executeAgent(agentType, taskDescription, { maxIterations: maxIter });
      return { success: true, result, iterations: maxIter };
    } catch (error) {
      return {
        success: false,
        result: error instanceof Error ? error.message : "Autonomous task failed",
        iterations: 0,
      };
    }
  }

  queueTask(agentType: AgentType, prompt: string, priority = 5): string {
    const task: AgentTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      agentType,
      prompt,
      priority,
      status: "idle",
      createdAt: new Date(),
    };
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => a.priority - b.priority);
    return task.id;
  }

  async processQueue(): Promise<{ completed: number; errors: number }> {
    let completed = 0;
    let errors = 0;

    const pending = this.taskQueue.filter((t) => t.status === "idle");
    for (const task of pending) {
      try {
        await this.executeAgent(task.agentType, task.prompt);
        completed++;
      } catch {
        errors++;
      }
    }

    return { completed, errors };
  }

  getMetrics(): AgentMetrics[] {
    const types: AgentType[] = ["royalty-tracker", "content-advisor", "contract-analyst", "marketing"];
    return types.map((type) => {
      const tasks = this.taskQueue.filter((t) => t.agentType === type);
      const completedTasks = tasks.filter((t) => t.status === "completed");
      const latencies = completedTasks
        .filter((t) => t.completedAt)
        .map((t) => t.completedAt!.getTime() - t.createdAt.getTime());

      return {
        agentType: type,
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        averageLatencyMs: latencies.length > 0
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0,
        successRate: tasks.length > 0 ? completedTasks.length / tasks.length : 0,
        lastActive: completedTasks.length > 0
          ? completedTasks[completedTasks.length - 1]!.completedAt
          : undefined,
      };
    });
  }

  getDecisionHistory(limit = 50): AgentDecision[] {
    return this.decisions.slice(-limit);
  }

  getQueueStatus() {
    return {
      total: this.taskQueue.length,
      pending: this.taskQueue.filter((t) => t.status === "idle").length,
      running: this.taskQueue.filter((t) => t.status === "running").length,
      completed: this.taskQueue.filter((t) => t.status === "completed").length,
      errors: this.taskQueue.filter((t) => t.status === "error").length,
    };
  }

  setAutonomousMode(enabled: boolean) {
    this.autonomousMode = enabled;
  }

  isAutonomous() {
    return this.autonomousMode;
  }
}

export const agentManager = new AgentManager();
