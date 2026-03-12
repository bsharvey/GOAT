import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

interface DecisionSummary {
  id: string;
  dsrNumber: string;
  title: string;
  status: string;
  question: string;
  synthesis: string | null;
  alignment: string | null;
  perspectiveCount: number;
  evidenceCount: number;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  research: "bg-blue-900/50 text-blue-300",
  council: "bg-purple-900/50 text-purple-300",
  decided: "bg-green-900/50 text-green-300",
  implementing: "bg-yellow-900/50 text-yellow-300",
  completed: "bg-emerald-900/50 text-emerald-300",
  refused: "bg-red-900/50 text-red-300",
  escalated: "bg-orange-900/50 text-orange-300",
  abandoned: "bg-gray-900/50 text-gray-300",
};

export default function Decisions() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data } = useQuery({
    queryKey: ["decisions", statusFilter],
    queryFn: () =>
      axios
        .get(`${API}/api/decisions${statusFilter ? `?status=${statusFilter}` : ""}`)
        .then(r => r.data),
  });

  const { data: detail } = useQuery({
    queryKey: ["decision", selectedId],
    queryFn: () => axios.get(`${API}/api/decisions/${selectedId}`).then(r => r.data.decision),
    enabled: !!selectedId,
  });

  const decisions = (data?.decisions || []) as DecisionSummary[];
  const stats = data?.stats as Record<string, unknown> | undefined;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-goat-gold mb-2">Decision System of Record</h2>
        <p className="text-yellow-200/60 text-sm">
          Every significant decision is recorded as a DSR — a structured judicial
          document with IRAC reasoning, evidence, and reflection.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="border border-yellow-900/50 rounded-lg p-4 bg-black/30">
            <p className="text-2xl font-bold text-goat-gold">{stats.total as number}</p>
            <p className="text-xs text-yellow-200/60">Total DSRs</p>
          </div>
          <div className="border border-yellow-900/50 rounded-lg p-4 bg-black/30">
            <p className="text-2xl font-bold text-yellow-200">{stats.totalPerspectives as number}</p>
            <p className="text-xs text-yellow-200/60">Perspectives</p>
          </div>
          <div className="border border-yellow-900/50 rounded-lg p-4 bg-black/30">
            <p className="text-2xl font-bold text-yellow-200">{stats.totalEvidence as number}</p>
            <p className="text-xs text-yellow-200/60">Evidence Items</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter("")}
          className={`text-xs px-3 py-1 rounded-full transition ${
            !statusFilter ? "bg-goat-gold text-black" : "bg-yellow-900/30 text-yellow-300 hover:bg-yellow-900/50"
          }`}
        >
          All
        </button>
        {["research", "council", "decided", "implementing", "completed"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1 rounded-full transition ${
              statusFilter === s ? "bg-goat-gold text-black" : "bg-yellow-900/30 text-yellow-300 hover:bg-yellow-900/50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Decision List */}
      <div className="space-y-2">
        {decisions.map(d => (
          <button
            key={d.id}
            onClick={() => setSelectedId(d.id)}
            className={`w-full text-left border rounded-lg p-4 bg-black/30 transition hover:bg-black/50 ${
              selectedId === d.id ? "border-goat-gold" : "border-yellow-900/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <span className="text-yellow-200/60 text-sm font-mono">{d.dsrNumber}</span>
                <span className="text-yellow-100 font-semibold">{d.title}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${statusColors[d.status] || "bg-yellow-900/50 text-yellow-300"}`}>
                {d.status}
              </span>
            </div>
            <p className="text-sm text-yellow-200/60">{d.question.slice(0, 100)}</p>
            <div className="flex gap-4 mt-2 text-xs text-yellow-200/40">
              <span>{d.perspectiveCount} perspectives</span>
              <span>{d.evidenceCount} evidence</span>
              <span>{new Date(d.createdAt).toLocaleDateString()}</span>
            </div>
          </button>
        ))}

        {decisions.length === 0 && (
          <p className="text-yellow-200/40 text-center py-8">
            No decisions recorded yet. Submit a question to the council to create the first DSR.
          </p>
        )}
      </div>

      {/* Detail Panel */}
      {detail && (
        <div className="border border-yellow-900/50 rounded-lg p-6 bg-black/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-goat-gold">
              {(detail as Record<string, unknown>).dsrNumber as string}: {(detail as Record<string, unknown>).title as string}
            </h3>
            <span className={`text-xs px-3 py-1 rounded ${statusColors[(detail as Record<string, unknown>).status as string] || ""}`}>
              {(detail as Record<string, unknown>).status as string}
            </span>
          </div>

          <p className="text-yellow-100/80">{(detail as Record<string, unknown>).question as string}</p>

          {(detail as Record<string, unknown>).synthesis ? (
            <div className="border-t border-yellow-900/30 pt-4">
              <h4 className="text-sm font-semibold text-yellow-200/80 uppercase tracking-wide mb-2">
                Synthesis
              </h4>
              <p className="text-yellow-100/90">
                {(detail as Record<string, unknown>).synthesis as string}
              </p>
            </div>
          ) : null}

          {/* Perspectives */}
          {((detail as Record<string, unknown>).perspectives as Array<Record<string, unknown>>)?.length > 0 && (
            <div className="border-t border-yellow-900/30 pt-4">
              <h4 className="text-sm font-semibold text-yellow-200/80 uppercase tracking-wide mb-2">
                Perspectives ({((detail as Record<string, unknown>).perspectives as Array<Record<string, unknown>>).length})
              </h4>
              <div className="space-y-2">
                {((detail as Record<string, unknown>).perspectives as Array<Record<string, unknown>>).map((p, i) => (
                  <div key={i} className="border border-yellow-900/30 rounded p-3 bg-black/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-yellow-200 text-sm">{p.archetypeId as string}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        p.verdict === "ALIGNED"
                          ? "bg-green-900/50 text-green-300"
                          : p.verdict === "OPPOSE"
                            ? "bg-red-900/50 text-red-300"
                            : "bg-yellow-900/50 text-yellow-300"
                      }`}>
                        {p.verdict as string}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
