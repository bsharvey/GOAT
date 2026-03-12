import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import axios from "axios";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "";
const CHART_COLORS = ["#d4a017", "#e6b422", "#f0c030", "#c49000", "#b8860b", "#daa520"];

function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]!);
  const rows = data.map((row) => headers.map((h) => String(row[h] ?? "")).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [songTitle, setSongTitle] = useState("");
  const [songPlays, setSongPlays] = useState("");
  const [songLikes, setSongLikes] = useState("");
  const [tab, setTab] = useState<"streams" | "mlc" | "soundexchange" | "superbass">("streams");

  const { data: dataStats } = useQuery({
    queryKey: ["dataStats"],
    queryFn: () => axios.get(`${API}/api/data/stats`).then((r) => r.data),
  });

  const { data: songs } = useQuery({
    queryKey: ["songs"],
    queryFn: () => axios.get(`${API}/api/royalties/songs`).then((r) => r.data.data),
  });

  const { data: mlcData } = useQuery({
    queryKey: ["mlc"],
    queryFn: () => axios.get(`${API}/api/data/mlc`).then((r) => r.data.data),
  });

  const { data: sxData } = useQuery({
    queryKey: ["soundexchange"],
    queryFn: () => axios.get(`${API}/api/data/soundexchange`).then((r) => r.data.data),
  });

  const { data: superBassData } = useQuery({
    queryKey: ["superbass"],
    queryFn: () => axios.get(`${API}/api/data/superbass`).then((r) => r.data.data),
  });

  const { data: revenueByPeriod } = useQuery({
    queryKey: ["dashboard-revenue-period"],
    queryFn: () => axios.get(`${API}/api/reports/revenue-by-period?months=12`).then((r) => r.data.data).catch(() => []),
  });

  const { data: revenueBySource } = useQuery({
    queryKey: ["dashboard-revenue-source"],
    queryFn: () => axios.get(`${API}/api/reports/revenue-by-source`).then((r) => r.data.data).catch(() => []),
  });

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim()) return;
    await axios.post(`${API}/api/royalties/songs`, {
      title: songTitle,
      plays: parseInt(songPlays) || 0,
      likes: parseInt(songLikes) || 0,
    });
    setSongTitle("");
    setSongPlays("");
    setSongLikes("");
    queryClient.invalidateQueries({ queryKey: ["songs"] });
  };

  const stats = dataStats || {};

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-yellow-900/40 bg-gradient-to-br from-black/80 via-yellow-950/20 to-black/80"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-goat-dark via-transparent to-goat-dark z-10" />
        <div className="relative z-20 flex items-center gap-8 p-8 md:p-12">
          <img
            src="/images/goat-logo.png"
            alt="GOAT"
            className="hidden md:block w-40 h-40 rounded-xl object-cover ring-2 ring-goat-gold/30 shadow-2xl shadow-yellow-900/20"
          />
          <div className="flex-1">
            <h2 className="text-4xl md:text-5xl font-bangers tracking-wide text-shimmer mb-2">
              GOAT Royalty Dashboard
            </h2>
            <p className="text-yellow-200/60 text-lg max-w-xl">
              Music Royalty Tracking, Analytics & Monetization Intelligence
            </p>
            <div className="flex gap-3 mt-4">
              <span className="text-xs px-3 py-1 rounded-full bg-green-900/40 text-green-300 border border-green-800/30">
                System Online
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-900/40 text-yellow-300 border border-yellow-800/30">
                OmniLLM Active
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `$${(stats.totalCombinedRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, accent: true },
          { label: "Total Plays", value: (stats.totalPlays ?? 0).toLocaleString() },
          { label: "MLC Records", value: stats.mlcRecords ?? 0 },
          { label: "Artists", value: stats.uniqueArtists ?? 0 },
          { label: "Mechanical $", value: `$${(stats.totalMechanicalRoyalties ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, accent: true },
          { label: "SoundExchange $", value: `$${(stats.totalSoundExchangeRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, accent: true },
          { label: "SX Records", value: stats.soundExchangeRecords ?? 0 },
          { label: "Bass Tracks", value: stats.superBassTracks ?? 0 },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="card-glow bg-black/60 border border-yellow-900/40 rounded-xl p-4"
          >
            <p className="text-yellow-200/60 text-xs uppercase tracking-wide">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.accent ? "text-goat-gold" : "text-yellow-100"}`}>
              {card.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time */}
        {revenueByPeriod && revenueByPeriod.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-black/50 border border-yellow-900/40 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-yellow-300 mb-4">Revenue Trend (12 months)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueByPeriod}>
                <defs>
                  <linearGradient id="dashGoldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4a017" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#d4a017" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="period" tick={{ fill: "#a0a0a0", fontSize: 10 }} />
                <YAxis tick={{ fill: "#a0a0a0", fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #444", borderRadius: 8 }}
                  labelStyle={{ color: "#d4a017" }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="total" stroke="#d4a017" fill="url(#dashGoldGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Revenue by Source Pie */}
        {revenueBySource && revenueBySource.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-black/50 border border-yellow-900/40 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-yellow-300 mb-4">Revenue by Source</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={revenueBySource}
                  dataKey="total"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ source, percent }: { source: string; percent: number }) =>
                    `${source} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: "#666" }}
                >
                  {(revenueBySource as Array<{ source: string; total: number }>).map((_: unknown, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #444", borderRadius: 8 }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      {/* Add Song Form */}
      <div className="bg-black/50 border border-yellow-900/40 rounded-xl p-6">
        <h3 className="text-xl font-bold text-goat-gold mb-4">Add New Song</h3>
        <form onSubmit={handleAddSong} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            placeholder="Song title..."
            className="bg-black/60 border border-yellow-900/40 rounded-lg px-4 py-2.5 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold focus:ring-1 focus:ring-goat-gold/30 transition"
          />
          <input
            type="number"
            value={songPlays}
            onChange={(e) => setSongPlays(e.target.value)}
            placeholder="Plays"
            className="bg-black/60 border border-yellow-900/40 rounded-lg px-4 py-2.5 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold focus:ring-1 focus:ring-goat-gold/30 transition"
          />
          <input
            type="number"
            value={songLikes}
            onChange={(e) => setSongLikes(e.target.value)}
            placeholder="Likes"
            className="bg-black/60 border border-yellow-900/40 rounded-lg px-4 py-2.5 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold focus:ring-1 focus:ring-goat-gold/30 transition"
          />
          <button
            type="submit"
            className="bg-goat-gold text-black font-bold px-6 py-2.5 rounded-lg hover:bg-yellow-400 active:scale-[0.98] transition-all"
          >
            Add Song
          </button>
        </form>
      </div>

      {/* Data Tabs */}
      <div className="bg-black/50 border border-yellow-900/40 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {([
            { key: "streams", label: "Streaming" },
            { key: "mlc", label: "MLC Royalties" },
            { key: "soundexchange", label: "SoundExchange" },
            { key: "superbass", label: "SuperBass" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-goat-gold text-black shadow-lg shadow-yellow-900/20"
                  : "border border-yellow-900/40 text-yellow-200/70 hover:border-goat-gold hover:text-goat-gold"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Streaming Metrics */}
        {tab === "streams" && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-yellow-300">Streaming Metrics</h3>
              {songs?.length > 0 && (
                <button
                  onClick={() => exportCSV(songs, "streaming-metrics.csv")}
                  className="text-xs text-yellow-200 border border-yellow-900/40 px-3 py-1.5 rounded-lg hover:bg-goat-gold hover:text-black transition"
                >
                  Export CSV
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-900/40">
                    <th className="text-left py-3 text-yellow-200/60 font-medium">Title</th>
                    <th className="text-right py-3 text-yellow-200/60 font-medium">Plays</th>
                    <th className="text-right py-3 text-yellow-200/60 font-medium">Likes</th>
                  </tr>
                </thead>
                <tbody>
                  {(songs ?? []).map((song: { id: string; title: string; plays: number; likes: number }) => (
                    <tr key={song.id} className="border-b border-yellow-900/20 hover:bg-yellow-900/10 transition">
                      <td className="py-3 text-white">{song.title}</td>
                      <td className="py-3 text-right text-yellow-200">{song.plays.toLocaleString()}</td>
                      <td className="py-3 text-right text-yellow-200">{song.likes.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!songs || songs.length === 0) && (
                    <tr><td colSpan={3} className="py-8 text-center text-yellow-200/40">No songs yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MLC Mechanical Royalties */}
        {tab === "mlc" && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-yellow-300">Mechanical Royalties (MLC)</h3>
              {mlcData?.length > 0 && (
                <button
                  onClick={() => exportCSV(mlcData, "mlc-royalties.csv")}
                  className="text-xs text-yellow-200 border border-yellow-900/40 px-3 py-1.5 rounded-lg hover:bg-goat-gold hover:text-black transition"
                >
                  Export CSV
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-900/40">
                    <th className="text-left py-3 text-yellow-200/60 font-medium">Writer</th>
                    <th className="text-left py-3 text-yellow-200/60 font-medium">ISRC</th>
                    <th className="text-left py-3 text-yellow-200/60 font-medium">Source</th>
                    <th className="text-right py-3 text-yellow-200/60 font-medium">Mechanical</th>
                  </tr>
                </thead>
                <tbody>
                  {(mlcData ?? []).map((row: { writer: string; isrc: string; source: string; mechanical: number }, i: number) => (
                    <tr key={i} className="border-b border-yellow-900/20 hover:bg-yellow-900/10 transition">
                      <td className="py-3 text-white">{row.writer}</td>
                      <td className="py-3 text-yellow-200 font-mono text-xs">{row.isrc}</td>
                      <td className="py-3 text-yellow-200">{row.source}</td>
                      <td className="py-3 text-right text-goat-gold font-medium">${row.mechanical.toFixed(2)}</td>
                    </tr>
                  ))}
                  {(!mlcData || mlcData.length === 0) && (
                    <tr><td colSpan={4} className="py-8 text-center text-yellow-200/40">No MLC data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SoundExchange */}
        {tab === "soundexchange" && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-yellow-300">SoundExchange Data</h3>
              {sxData?.length > 0 && (
                <button
                  onClick={() => exportCSV(sxData, "soundexchange.csv")}
                  className="text-xs text-yellow-200 border border-yellow-900/40 px-3 py-1.5 rounded-lg hover:bg-goat-gold hover:text-black transition"
                >
                  Export CSV
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-900/40">
                    <th className="text-left py-3 text-yellow-200/60 font-medium">Artist</th>
                    <th className="text-left py-3 text-yellow-200/60 font-medium">ISRC</th>
                    <th className="text-right py-3 text-yellow-200/60 font-medium">Mechanical</th>
                    <th className="text-right py-3 text-yellow-200/60 font-medium">Plays</th>
                    <th className="text-right py-3 text-yellow-200/60 font-medium">Likes</th>
                  </tr>
                </thead>
                <tbody>
                  {(sxData ?? []).map((row: { artist: string; isrc: string; mechanical: number; plays: number; likes: number }, i: number) => (
                    <tr key={i} className="border-b border-yellow-900/20 hover:bg-yellow-900/10 transition">
                      <td className="py-3 text-white">{row.artist}</td>
                      <td className="py-3 text-yellow-200 font-mono text-xs">{row.isrc}</td>
                      <td className="py-3 text-right text-goat-gold font-medium">${row.mechanical.toFixed(2)}</td>
                      <td className="py-3 text-right text-yellow-200">{row.plays.toLocaleString()}</td>
                      <td className="py-3 text-right text-yellow-200">{row.likes.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!sxData || sxData.length === 0) && (
                    <tr><td colSpan={5} className="py-8 text-center text-yellow-200/40">No SoundExchange data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SuperBass */}
        {tab === "superbass" && (
          <div>
            <h3 className="text-lg font-bold text-yellow-300 mb-3">SuperBass Stats</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-900/40">
                    <th className="text-left py-3 text-yellow-200/60 font-medium">Mix Name</th>
                    <th className="text-left py-3 text-yellow-200/60 font-medium">Genre</th>
                    <th className="text-right py-3 text-yellow-200/60 font-medium">BPM</th>
                    <th className="text-right py-3 text-yellow-200/60 font-medium">Peak Loudness</th>
                  </tr>
                </thead>
                <tbody>
                  {(superBassData ?? []).map((mix: { name: string; genre?: string; bpm: number; loudness: number }, i: number) => (
                    <tr key={i} className="border-b border-yellow-900/20 hover:bg-yellow-900/10 transition">
                      <td className="py-3 text-white">{mix.name}</td>
                      <td className="py-3 text-yellow-200">{mix.genre || "\u2014"}</td>
                      <td className="py-3 text-right text-yellow-200">{mix.bpm}</td>
                      <td className="py-3 text-right text-goat-gold font-medium">{mix.loudness} dB</td>
                    </tr>
                  ))}
                  {(!superBassData || superBassData.length === 0) && (
                    <tr><td colSpan={4} className="py-8 text-center text-yellow-200/40">No SuperBass data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* The Truth About Music Monetization */}
      <div className="bg-black/50 border border-yellow-900/40 rounded-xl p-6">
        <h3 className="text-xl font-bold text-goat-gold mb-3">The Truth About Music Monetization</h3>
        <p className="text-yellow-200/70 leading-relaxed text-sm">
          The Music Modernization Act (MMA) was supposed to help songwriters, but the truth is: it centralized
          control under the MLC, while the Department of Justice kept ASCAP and BMI shackled under outdated
          consent decrees. These PROs &mdash; ASCAP, BMI, SESAC, and GMR &mdash; sold out years ago. They've been licensing
          your work but haven't empowered you to collect everything you're owed.
        </p>
        <p className="text-yellow-200/70 leading-relaxed text-sm mt-3">
          Just registering a song in the MLC doesn't mean you'll get paid. If your data doesn't match exactly &mdash;
          like ISRCs or publisher info &mdash; your money goes to the "black box" or worse, to someone else. This app
          was built to expose that. If your portal says $0, don't blame yourself &mdash; blame the broken system we're here to fix.
        </p>
      </div>

      {/* PRO & Society Check Tools */}
      <div className="bg-black/50 border border-yellow-900/40 rounded-xl p-6">
        <h3 className="text-xl font-bold text-goat-gold mb-4">PRO & Society Check Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Search ASCAP Repertory", url: "https://www.ascap.com/repertory" },
            { label: "Search BMI Repertoire", url: "https://repertoire.bmi.com/" },
            { label: "SoundExchange Claim Tool", url: "https://www.soundexchange.com/tools/claim-your-account/" },
            { label: "The MLC \u2014 Register Your Works", url: "https://www.themlc.com/" },
          ].map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-3 rounded-lg border border-yellow-900/40 text-yellow-200 hover:border-goat-gold hover:text-goat-gold transition group"
            >
              <svg className="w-4 h-4 opacity-40 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="text-sm">{link.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
