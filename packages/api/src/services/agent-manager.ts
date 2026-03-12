/**
 * Autonomous Agent Manager — GOAT Force AI Agents
 *
 * 4 specialized agents that handle different domains:
 * - Royalty Tracker: monitors and analyzes royalty streams
 * - Content Advisor: recommends content strategies
 * - Contract Analyst: reviews and drafts contracts
 * - Marketing Agent: plans marketing campaigns
 */

import type { AgentType, AgentTask, AgentDecision, AgentMetrics } from "@goat/core";
import { OmniLLMService } from "./omni-llm.js";
import { ragService } from "./rag.js";

interface AgentDef {
  type: AgentType;
  name: string;
  model: string;
  systemPrompt: string;
  tools: string[];
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
    tools: ["analyze-revenue", "track-streams", "detect-underpayment", "forecast"],
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
    tools: ["analyze-content", "recommend-strategy", "trend-detection"],
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
    tools: ["review-contract", "calculate-splits", "draft-terms"],
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
    tools: ["plan-campaign", "analyze-demographics", "optimize-spend"],
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
      tools: a.tools,
    }));
  }

  async executeAgent(agentType: AgentType, prompt: string): Promise<string> {
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

    try {
      // Build RAG context
      const ragContext = ragService.buildContext(prompt);

      // Build full prompt with agent system prompt + RAG context
      const fullPrompt = `${agent.systemPrompt}\n\n${ragContext}User request: ${prompt}`;

      const result = await this.llm.callModel(agent.model, fullPrompt);

      // Record decision
      const decision: AgentDecision = {
        id: `dec-${Date.now()}`,
        agentType,
        task: prompt,
        decision: result.slice(0, 200),
        confidence: 0.85,
        reasoning: `Processed by ${agent.name} using ${agent.model}`,
        timestamp: new Date(),
      };
      this.decisions.push(decision);
      if (this.decisions.length > 1000) this.decisions.shift();

      task.status = "completed";
      task.result = result;
      task.completedAt = new Date();

      return result;
    } catch (error) {
      task.status = "error";
      task.error = error instanceof Error ? error.message : "Unknown error";
      throw error;
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
