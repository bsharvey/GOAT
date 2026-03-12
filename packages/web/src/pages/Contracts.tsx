import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

interface Contract {
  id: string;
  title: string;
  type: string;
  status: string;
  start_date: string;
  end_date?: string;
  duration_months: number;
}

export default function Contracts() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["contracts", statusFilter, page],
    queryFn: () =>
      axios
        .get(`${API}/api/contracts`, {
          params: { status: statusFilter || undefined, limit, offset: page * limit },
        })
        .then((r) => r.data),
  });

  const { data: expiringData } = useQuery({
    queryKey: ["contracts-expiring"],
    queryFn: () => axios.get(`${API}/api/contracts/expiring?days=30`).then((r) => r.data),
  });

  const contracts: Contract[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const expiring: Contract[] = expiringData?.data ?? [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-3xl font-bangers tracking-wide text-goat-gold">Contracts</h2>
        <p className="text-yellow-200/50 text-sm mt-1">Manage recording, publishing & distribution contracts</p>
      </motion.div>

      {/* Expiring Alert */}
      {expiring.length > 0 && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4">
          <h3 className="text-red-300 font-bold text-sm mb-2">
            {expiring.length} contract{expiring.length !== 1 ? "s" : ""} expiring within 30 days
          </h3>
          <div className="flex flex-wrap gap-2">
            {expiring.map((c) => (
              <span key={c.id} className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-200">
                {c.title} — {c.end_date ? new Date(c.end_date).toLocaleDateString() : "N/A"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2">
        {["", "draft", "active", "expired", "terminated"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === s
                ? "bg-goat-gold text-black"
                : "border border-yellow-900/40 text-yellow-200/70 hover:border-goat-gold"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Contracts Table */}
      <div className="bg-black/50 border border-yellow-900/40 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-yellow-900/40">
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Title</th>
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Type</th>
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Start</th>
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="py-8 text-center text-yellow-200/40">Loading...</td></tr>
              )}
              {!isLoading && contracts.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-yellow-200/40">No contracts found.</td></tr>
              )}
              {contracts.map((c) => (
                <tr key={c.id} className="border-b border-yellow-900/20 hover:bg-yellow-900/10 transition">
                  <td className="py-3 px-4 text-white font-medium">{c.title}</td>
                  <td className="py-3 px-4 text-yellow-200/70 capitalize">{c.type}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      c.status === "active" ? "bg-green-900/40 text-green-300 border border-green-800/30" :
                      c.status === "expired" ? "bg-red-900/40 text-red-300 border border-red-800/30" :
                      c.status === "terminated" ? "bg-red-900/40 text-red-300 border border-red-800/30" :
                      "bg-yellow-900/40 text-yellow-300 border border-yellow-800/30"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-yellow-200/50 text-xs">
                    {new Date(c.start_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-yellow-200/50 text-xs">{c.duration_months} months</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-yellow-900/40">
            <span className="text-yellow-200/40 text-sm">{total} total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 rounded text-sm border border-yellow-900/40 text-yellow-200/70 disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(page + 1)} disabled={(page + 1) * limit >= total} className="px-3 py-1 rounded text-sm border border-yellow-900/40 text-yellow-200/70 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
