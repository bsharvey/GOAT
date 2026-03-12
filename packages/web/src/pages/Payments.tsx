import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

interface Payment {
  id: string;
  artist_id: string;
  total_amount: number;
  net_amount: number;
  method: string;
  status: string;
  transaction_id?: string;
  created_at: string;
}

export default function Payments() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["payments", statusFilter, page],
    queryFn: () =>
      axios
        .get(`${API}/api/payments`, {
          params: { status: statusFilter || undefined, limit, offset: page * limit },
        })
        .then((r) => r.data),
  });

  const payments: Payment[] = data?.data ?? [];
  const total = data?.total ?? 0;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-900/40 text-yellow-300 border-yellow-800/30",
    processing: "bg-blue-900/40 text-blue-300 border-blue-800/30",
    completed: "bg-green-900/40 text-green-300 border-green-800/30",
    failed: "bg-red-900/40 text-red-300 border-red-800/30",
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-3xl font-bangers tracking-wide text-goat-gold">Payments</h2>
        <p className="text-yellow-200/50 text-sm mt-1">Payment history and processing</p>
      </motion.div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {["", "pending", "processing", "completed", "failed"].map((s) => (
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

      {/* Payments Table */}
      <div className="bg-black/50 border border-yellow-900/40 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-yellow-900/40">
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Transaction</th>
                <th className="text-right py-3 px-4 text-yellow-200/60 font-medium">Amount</th>
                <th className="text-right py-3 px-4 text-yellow-200/60 font-medium">Net</th>
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Method</th>
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="py-8 text-center text-yellow-200/40">Loading...</td></tr>
              )}
              {!isLoading && payments.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-yellow-200/40">No payments found.</td></tr>
              )}
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-yellow-900/20 hover:bg-yellow-900/10 transition">
                  <td className="py-3 px-4 text-yellow-200 font-mono text-xs">
                    {p.transaction_id || p.id.slice(0, 8)}
                  </td>
                  <td className="py-3 px-4 text-right text-goat-gold font-medium">
                    ${p.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right text-yellow-200">
                    ${p.net_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-yellow-200/70 capitalize">{p.method.replace("_", " ")}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[p.status] || ""}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-yellow-200/50 text-xs">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
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
