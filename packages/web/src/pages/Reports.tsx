import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import axios from "axios";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "";

const COLORS = ["#d4a017", "#e6b422", "#f0c030", "#c49000", "#b8860b", "#daa520"];

export default function Reports() {
  const [months, setMonths] = useState(12);

  const { data: revenueBySource } = useQuery({
    queryKey: ["report-revenue-source"],
    queryFn: () => axios.get(`${API}/api/reports/revenue-by-source`).then((r) => r.data.data),
  });

  const { data: revenueByPeriod } = useQuery({
    queryKey: ["report-revenue-period", months],
    queryFn: () =>
      axios.get(`${API}/api/reports/revenue-by-period`, { params: { months } }).then((r) => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ["report-stats"],
    queryFn: () => axios.get(`${API}/api/reports/stats`).then((r) => r.data.data),
  });

  const sourceData = (revenueBySource ?? []) as Array<{ source: string; total: number; count: number }>;
  const periodData = (revenueByPeriod ?? []) as Array<{ period: string; total: number; count: number }>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-3xl font-bangers tracking-wide text-goat-gold">Reports & Analytics</h2>
        <p className="text-yellow-200/50 text-sm mt-1">Revenue insights from your royalty data</p>
      </motion.div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: `$${(stats.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, accent: true },
            { label: "Total Records", value: stats.totalRecords ?? 0 },
            { label: "Unique Artists", value: stats.uniqueArtists ?? 0 },
            { label: "Avg per Record", value: `$${(stats.averagePerRecord ?? 0).toFixed(2)}` },
          ].map((card) => (
            <div key={card.label} className="bg-black/60 border border-yellow-900/40 rounded-xl p-4">
              <p className="text-yellow-200/60 text-xs uppercase tracking-wide">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.accent ? "text-goat-gold" : "text-yellow-100"}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time */}
        <div className="bg-black/50 border border-yellow-900/40 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-yellow-300">Revenue Over Time</h3>
            <div className="flex gap-1">
              {[6, 12, 24].map((m) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={`px-2 py-1 rounded text-xs ${
                    months === m ? "bg-goat-gold text-black" : "text-yellow-200/50 hover:text-goat-gold"
                  }`}
                >
                  {m}mo
                </button>
              ))}
            </div>
          </div>
          {periodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={periodData}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4a017" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#d4a017" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="period" tick={{ fill: "#a0a0a0", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a0a0a0", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #444", borderRadius: 8 }}
                  labelStyle={{ color: "#d4a017" }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="total" stroke="#d4a017" fill="url(#goldGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-yellow-200/30">No period data</div>
          )}
        </div>

        {/* Revenue by Source */}
        <div className="bg-black/50 border border-yellow-900/40 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-300 mb-4">Revenue by Source</h3>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sourceData}
                  dataKey="total"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ source, percent }) =>
                    `${source} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: "#666" }}
                >
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #444", borderRadius: 8 }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                />
                <Legend wrapperStyle={{ color: "#a0a0a0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-yellow-200/30">No source data</div>
          )}
        </div>
      </div>
    </div>
  );
}
