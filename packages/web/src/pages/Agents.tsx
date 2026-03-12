import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

type AgentType = "royalty-tracker" | "content-advisor" | "contract-analyst" | "marketing";

const AGENT_INFO: Record<AgentType, { name: string; description: string; color: string }> = {
  "royalty-tracker": {
    name: "Royalty Tracker",
    description: "Monitors and analyzes royalty streams, detects missing payments, forecasts revenue",
    color: "text-green-400",
  },
  "content-advisor": {
    name: "Content Advisor",
    description: "Recommends release strategies, analyzes content performance, tracks trends",
    color: "text-blue-400",
  },
  "contract-analyst": {
    name: "Contract Analyst",
    description: "Reviews contract terms, calculates royalty splits, drafts smart contract parameters",
    color: "text-purple-400",
  },
  "marketing": {
    name: "Marketing Agent",
    description: "Plans marketing campaigns, identifies demographics, optimizes ad spend",
    color: "text-pink-400",
  },
};

export default function Agents() {
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("royalty-tracker");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: metrics } = useQuery({
    queryKey: ["agentMetrics"],
    queryFn: () => axios.get(`${API}/api/agents/metrics`).then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: decisions } = useQuery({
    queryKey: ["agentDecisions"],
    queryFn: () => axios.get(`${API}/api/agents/decisions?limit=10`).then((r) => r.data.decisions),
  });

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse("");
    try {
      const { data } = await axios.post(`${API}/api/agents/execute`, {
        agentType: selectedAgent,
        prompt,
      });
      setResponse(data.result);
      queryClient.invalidateQueries({ queryKey: ["agentMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["agentDecisions"] });
    } catch (err) {
      setResponse("Error: " + (err instanceof Error ? err.message : "Failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-goat-gold">Autonomous Agents</h2>
        <p className="text-yellow-200/70 mt-1">
          AI agents that handle royalty tracking, content strategy, contracts, and marketing.
        </p>
      </div>

      {/* Agent Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(AGENT_INFO) as [AgentType, typeof AGENT_INFO[AgentType]][]).map(([type, info]) => (
          <button
            key={type}
            onClick={() => setSelectedAgent(type)}
            className={`text-left p-4 rounded-lg border transition ${
              selectedAgent === type
                ? "bg-goat-gold/10 border-goat-gold"
                : "bg-black/60 border-yellow-900/50 hover:border-yellow-700"
            }`}
          >
            <h4 className={`font-bold ${info.color}`}>{info.name}</h4>
            <p className="text-yellow-200/50 text-xs mt-1">{info.description}</p>
          </button>
        ))}
      </div>

      {/* Execute Agent */}
      <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-goat-gold mb-3">
          Execute {AGENT_INFO[selectedAgent].name}
        </h3>
        <form onSubmit={handleExecute} className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Ask the ${AGENT_INFO[selectedAgent].name}...`}
            rows={3}
            className="w-full bg-black/80 border border-yellow-900/50 rounded-lg px-4 py-3 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold resize-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-goat-gold text-black font-bold px-8 py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50"
          >
            {loading ? "Processing..." : "Execute"}
          </button>
        </form>

        {response && (
          <div className="mt-4 bg-black/80 border border-yellow-900/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-200/70 mb-2">Agent Response</h4>
            <div className="text-white whitespace-pre-wrap text-sm">{response}</div>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(metrics?.metrics ?? []).map((m: { agentType: string; totalTasks: number; successRate: number; averageLatencyMs: number }) => {
          const info = AGENT_INFO[m.agentType as AgentType];
          return (
            <div key={m.agentType} className="bg-black/60 border border-yellow-900/50 rounded-lg p-4">
              <h4 className={`text-sm font-bold ${info?.color ?? "text-white"}`}>{info?.name ?? m.agentType}</h4>
              <div className="mt-2 space-y-1 text-xs">
                <p className="text-yellow-200/70">Tasks: <span className="text-white">{m.totalTasks}</span></p>
                <p className="text-yellow-200/70">Success: <span className="text-goat-gold">{(m.successRate * 100).toFixed(0)}%</span></p>
                <p className="text-yellow-200/70">Avg: <span className="text-white">{m.averageLatencyMs.toFixed(0)}ms</span></p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Decisions */}
      {decisions && decisions.length > 0 && (
        <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-goat-gold mb-3">Recent Decisions</h3>
          <div className="space-y-3">
            {decisions.map((d: { id: string; agentType: string; task: string; decision: string; timestamp: string }) => (
              <div key={d.id} className="border-b border-yellow-900/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${AGENT_INFO[d.agentType as AgentType]?.color ?? "text-white"}`}>
                    {AGENT_INFO[d.agentType as AgentType]?.name ?? d.agentType}
                  </span>
                  <span className="text-yellow-200/30 text-xs">{new Date(d.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-yellow-200/70 text-xs mt-1">{d.task}</p>
                <p className="text-white text-sm mt-1">{d.decision}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
