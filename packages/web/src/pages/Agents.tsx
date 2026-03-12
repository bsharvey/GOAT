import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

type AgentType = "royalty-tracker" | "content-advisor" | "contract-analyst" | "marketing";

const AGENTS: Record<AgentType, { name: string; description: string; color: string; icon: string }> = {
  "royalty-tracker": {
    name: "Royalty Tracker",
    description: "Monitors royalty streams, detects missing payments, and forecasts revenue",
    color: "text-green-400",
    icon: "$",
  },
  "content-advisor": {
    name: "Content Advisor",
    description: "Recommends release strategies and analyzes content performance",
    color: "text-blue-400",
    icon: "~",
  },
  "contract-analyst": {
    name: "Contract Analyst",
    description: "Reviews contract terms and calculates royalty splits",
    color: "text-purple-400",
    icon: "#",
  },
  "marketing": {
    name: "Marketing",
    description: "Plans campaigns, identifies demographics, and optimizes ad spend",
    color: "text-pink-400",
    icon: "%",
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
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-bangers tracking-wide text-goat-gold">Smart Agents</h2>
        <p className="text-yellow-200/50 text-sm mt-1">
          Specialized AI agents for royalties, content, contracts, and marketing
        </p>
      </motion.div>

      {/* Agent Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(AGENTS) as [AgentType, typeof AGENTS[AgentType]][]).map(([type, info], i) => (
          <motion.button
            key={type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedAgent(type)}
            className={`text-left p-5 rounded-xl border transition-all card-glow ${
              selectedAgent === type
                ? "bg-goat-gold/10 border-goat-gold ring-1 ring-goat-gold/20"
                : "bg-black/40 border-yellow-900/40 hover:border-yellow-700"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-2xl font-mono ${info.color}`}>{info.icon}</span>
              <h4 className={`font-bold text-sm ${info.color}`}>{info.name}</h4>
            </div>
            <p className="text-yellow-200/40 text-xs leading-relaxed">{info.description}</p>
          </motion.button>
        ))}
      </div>

      {/* Execute Agent */}
      <div className="bg-black/40 border border-yellow-900/40 rounded-xl p-6">
        <h3 className="text-lg font-bold text-goat-gold mb-4">
          {AGENTS[selectedAgent].name}
        </h3>
        <form onSubmit={handleExecute} className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Ask the ${AGENTS[selectedAgent].name}...`}
            rows={3}
            className="w-full bg-black/50 border border-yellow-900/40 rounded-xl px-4 py-3 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold focus:ring-1 focus:ring-goat-gold/20 transition resize-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-goat-gold text-black font-bold px-8 py-2.5 rounded-lg hover:bg-yellow-400 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : "Run"}
          </button>
        </form>

        {response && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-black/50 border border-yellow-900/30 rounded-xl p-4"
          >
            <div className="text-white whitespace-pre-wrap text-sm leading-relaxed">{response}</div>
          </motion.div>
        )}
      </div>

      {/* Metrics Grid */}
      {metrics?.metrics && metrics.metrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.metrics.map((m: { agentType: string; totalTasks: number; successRate: number; averageLatencyMs: number }, i: number) => {
            const info = AGENTS[m.agentType as AgentType];
            return (
              <motion.div
                key={m.agentType}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-black/40 border border-yellow-900/40 rounded-xl p-4 card-glow"
              >
                <h4 className={`text-xs font-bold uppercase tracking-wider ${info?.color ?? "text-white"}`}>{info?.name ?? m.agentType}</h4>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-yellow-200/50">Tasks</span>
                    <span className="text-white font-medium">{m.totalTasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-200/50">Success</span>
                    <span className="text-goat-gold font-medium">{(m.successRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-200/50">Speed</span>
                    <span className="text-white font-medium">{m.averageLatencyMs.toFixed(0)}ms</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Recent Activity */}
      {decisions && decisions.length > 0 && (
        <div className="bg-black/40 border border-yellow-900/40 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-100 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {decisions.map((d: { id: string; agentType: string; task: string; decision: string; timestamp: string }) => (
              <div key={d.id} className="border-b border-yellow-900/20 pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold ${AGENTS[d.agentType as AgentType]?.color ?? "text-white"}`}>
                    {AGENTS[d.agentType as AgentType]?.name ?? d.agentType}
                  </span>
                  <span className="text-yellow-200/20 text-xs">{new Date(d.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-yellow-200/50 text-xs">{d.task}</p>
                <p className="text-white text-sm mt-1">{d.decision}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
