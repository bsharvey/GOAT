// Autonomous agent types

export type AgentType = "royalty-tracker" | "content-advisor" | "contract-analyst" | "marketing";

export type AgentStatus = "idle" | "running" | "completed" | "error";

export interface AgentConfig {
  type: AgentType;
  name: string;
  model: string;
  systemPrompt: string;
  tools: string[];
  maxTokens: number;
  temperature: number;
}

export interface AgentTask {
  id: string;
  agentType: AgentType;
  prompt: string;
  priority: number; // 1 = highest
  status: AgentStatus;
  result?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface AgentDecision {
  id: string;
  agentType: AgentType;
  task: string;
  decision: string;
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

export interface AgentMetrics {
  agentType: AgentType;
  totalTasks: number;
  completedTasks: number;
  averageLatencyMs: number;
  successRate: number;
  lastActive?: Date;
}
