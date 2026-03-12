import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
      <div>
        <h2 className="text-2xl font-bold text-goat-gold mb-2">Archetypal Council</h2>
        <p className="text-yellow-200/60 text-sm">
          Submit a question for the council to deliberate. Multiple archetypes will
          provide IRAC-structured positions, and the Arbiter will synthesize a ruling.
        </p>
      </div>

      {/* Question Input */}
      <form onSubmit={handleDeliberate} className="space-y-4">
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask the council a question..."
          rows={3}
          className="w-full bg-black/40 border border-yellow-900/50 rounded-lg p-4 text-yellow-100 placeholder:text-yellow-700 focus:outline-none focus:border-goat-gold"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="bg-goat-gold text-black font-bold px-6 py-2 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50"
        >
          {loading ? "Deliberating..." : "Submit to Council"}
        </button>
      </form>

      {/* Active Deliberation */}
      {deliberation && (
        <div className="space-y-6">
          <div className="border border-yellow-900/50 rounded-lg p-6 bg-black/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-goat-gold">
                {deliberation.dsrNumber}
              </h3>
              <span className="text-sm px-3 py-1 rounded-full bg-yellow-900/50 text-yellow-200">
                {deliberation.synthesisVerdict}
              </span>
            </div>

            {/* Positions */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-semibold text-yellow-200/80 uppercase tracking-wide">
                Council Positions
              </h4>
              {(deliberation.positions || []).map((pos, i) => {
                const verdict = pos.irac?.conclusion || "";
                return (
                  <div key={i} className="border border-yellow-900/30 rounded p-3 bg-black/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-yellow-200">
                        {pos.archetype}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        verdict === "ALIGNED"
                          ? "bg-green-900/50 text-green-300"
                          : verdict === "OPPOSE"
                            ? "bg-red-900/50 text-red-300"
                            : "bg-yellow-900/50 text-yellow-300"
                      }`}>
                        {verdict}
                      </span>
                    </div>
                    <p className="text-yellow-100/80 text-sm">{pos.displayText}</p>
                  </div>
                );
              })}
            </div>

            {/* Synthesis */}
            {deliberation.synthesis ? (
              <div className="border-t border-yellow-900/30 pt-4">
                <h4 className="text-sm font-semibold text-yellow-200/80 uppercase tracking-wide mb-2">
                  Arbiter Synthesis
                </h4>
                <p className="text-yellow-100/90">
                  {deliberation.synthesis}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Stats */}
      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-yellow-900/50 rounded-lg p-4 bg-black/30">
            <p className="text-2xl font-bold text-goat-gold">{stats.total}</p>
            <p className="text-xs text-yellow-200/60">Total Deliberations</p>
          </div>
          {stats.byVerdict ? Object.entries(stats.byVerdict).map(([verdict, count]) => (
            <div key={verdict} className="border border-yellow-900/50 rounded-lg p-4 bg-black/30">
              <p className="text-2xl font-bold text-yellow-200">{count}</p>
              <p className="text-xs text-yellow-200/60">{verdict}</p>
            </div>
          )) : null}
        </div>
      ) : null}

      {/* History */}
      {history && history.length > 0 ? (
        <div>
          <h3 className="text-lg font-bold text-yellow-200 mb-3">Deliberation History</h3>
          <div className="space-y-2">
            {history.map((d, i) => (
              <div key={i} className="border border-yellow-900/30 rounded p-3 bg-black/20 flex justify-between items-center">
                <div>
                  <span className="text-yellow-200/60 text-sm mr-2">{d.dsrNumber}</span>
                  <span className="text-yellow-100">{d.question?.slice(0, 80)}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  d.synthesisVerdict === "ALIGNED"
                    ? "bg-green-900/50 text-green-300"
                    : d.synthesisVerdict === "OPPOSE"
                      ? "bg-red-900/50 text-red-300"
                      : "bg-yellow-900/50 text-yellow-300"
                }`}>
                  {d.synthesisVerdict}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
