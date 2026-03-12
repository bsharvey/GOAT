import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

interface CouncilStats {
  total: number;
  byVerdict: Record<string, number>;
}

interface HistoryItem {
  dsrNumber: string;
  question: string;
  synthesisVerdict: string;
}

interface Position {
  archetype: string;
  displayText: string;
  irac?: { issue: string; rule: string; analysis: string; conclusion: string };
}

interface Deliberation {
  dsrNumber: string;
  synthesisVerdict: string;
  positions: Position[];
  synthesis: string | null;
}

export default function Council() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [deliberation, setDeliberation] = useState<Deliberation | null>(null);

  const { data: history } = useQuery<HistoryItem[]>({
    queryKey: ["councilHistory"],
    queryFn: () => axios.get(`${API}/api/council/history`).then(r => r.data.deliberations),
  });

  const { data: stats } = useQuery<CouncilStats>({
    queryKey: ["councilStats"],
    queryFn: () => axios.get(`${API}/api/council`).then(r => r.data.stats),
  });

  const handleDeliberate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setDeliberation(null);
    try {
      const { data } = await axios.post(`${API}/api/council/deliberate`, { question });
      setDeliberation(data.deliberation);
    } catch (err) {
      console.error("Council deliberation failed:", err);
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
        className="relative overflow-hidden rounded-2xl border border-purple-900/40 bg-gradient-to-br from-purple-950/30 via-black/60 to-black/80 p-8"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
        <h2 className="text-3xl font-bangers tracking-wide text-goat-gold mb-2">Archetypal Council</h2>
        <p className="text-yellow-200/60 text-sm max-w-xl">
          Submit a question for the council to deliberate. Multiple archetypes provide
          IRAC-structured positions, and the Arbiter synthesizes a ruling.
        </p>
      </motion.div>

      {/* Question Input */}
      <form onSubmit={handleDeliberate} className="space-y-4">
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask the council a question..."
          rows={3}
          className="w-full bg-black/50 border border-yellow-900/40 rounded-xl p-4 text-yellow-100 placeholder:text-yellow-900/60 focus:outline-none focus:border-goat-gold focus:ring-1 focus:ring-goat-gold/20 transition"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="bg-goat-gold text-black font-bold px-8 py-2.5 rounded-lg hover:bg-yellow-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Deliberating...
            </span>
          ) : "Submit to Council"}
        </button>
      </form>

      {/* Active Deliberation */}
      <AnimatePresence>
        {deliberation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="border border-yellow-900/40 rounded-xl p-6 bg-black/40">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-goat-gold">
                  {deliberation.dsrNumber}
                </h3>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                  deliberation.synthesisVerdict === "ALIGNED"
                    ? "bg-green-900/40 text-green-300 border border-green-800/30"
                    : deliberation.synthesisVerdict === "OPPOSE"
                      ? "bg-red-900/40 text-red-300 border border-red-800/30"
                      : "bg-yellow-900/40 text-yellow-300 border border-yellow-800/30"
                }`}>
                  {deliberation.synthesisVerdict}
                </span>
              </div>

              {/* Positions */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-semibold text-yellow-200/70 uppercase tracking-wider">
                  Council Positions
                </h4>
                {(deliberation.positions || []).map((pos, i) => {
                  const verdict = pos.irac?.conclusion || "";
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="border border-yellow-900/30 rounded-lg p-4 bg-black/30 card-glow"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-yellow-100">
                          {pos.archetype}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          verdict === "ALIGNED"
                            ? "bg-green-900/40 text-green-300"
                            : verdict === "OPPOSE"
                              ? "bg-red-900/40 text-red-300"
                              : "bg-yellow-900/40 text-yellow-300"
                        }`}>
                          {verdict}
                        </span>
                      </div>
                      <p className="text-yellow-100/70 text-sm leading-relaxed">{pos.displayText}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Synthesis */}
              {deliberation.synthesis && (
                <div className="border-t border-yellow-900/30 pt-6">
                  <h4 className="text-sm font-semibold text-yellow-200/70 uppercase tracking-wider mb-3">
                    Arbiter Synthesis
                  </h4>
                  <p className="text-yellow-100/80 leading-relaxed bg-yellow-900/10 rounded-lg p-4 border border-yellow-900/20">
                    {deliberation.synthesis}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-yellow-900/40 rounded-xl p-4 bg-black/40 card-glow">
            <p className="text-2xl font-bold text-goat-gold">{stats.total}</p>
            <p className="text-xs text-yellow-200/50 mt-1">Total Deliberations</p>
          </div>
          {stats.byVerdict ? Object.entries(stats.byVerdict).map(([verdict, count]) => (
            <div key={verdict} className="border border-yellow-900/40 rounded-xl p-4 bg-black/40 card-glow">
              <p className="text-2xl font-bold text-yellow-100">{count}</p>
              <p className="text-xs text-yellow-200/50 mt-1">{verdict}</p>
            </div>
          )) : null}
        </div>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-yellow-100 mb-3">Deliberation History</h3>
          <div className="space-y-2">
            {history.map((d, i) => (
              <div key={i} className="border border-yellow-900/30 rounded-lg p-4 bg-black/30 flex justify-between items-center card-glow">
                <div>
                  <span className="text-yellow-200/50 text-sm mr-2 font-mono">{d.dsrNumber}</span>
                  <span className="text-yellow-100/80">{d.question?.slice(0, 80)}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  d.synthesisVerdict === "ALIGNED"
                    ? "bg-green-900/40 text-green-300"
                    : d.synthesisVerdict === "OPPOSE"
                      ? "bg-red-900/40 text-red-300"
                      : "bg-yellow-900/40 text-yellow-300"
                }`}>
                  {d.synthesisVerdict}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
