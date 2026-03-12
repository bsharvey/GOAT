import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

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

  // Dashboard summary stats
  const { data: dataStats } = useQuery({
    queryKey: ["dataStats"],
    queryFn: () => axios.get(`${API}/api/data/stats`).then((r) => r.data),
  });

  // Existing song stats
  const { data: songs } = useQuery({
    queryKey: ["songs"],
    queryFn: () => axios.get(`${API}/api/royalties/songs`).then((r) => r.data.data),
  });

  // MLC data
  const { data: mlcData } = useQuery({
    queryKey: ["mlc"],
    queryFn: () => axios.get(`${API}/api/data/mlc`).then((r) => r.data.data),
  });

  // SoundExchange data
  const { data: sxData } = useQuery({
    queryKey: ["soundexchange"],
    queryFn: () => axios.get(`${API}/api/data/soundexchange`).then((r) => r.data.data),
  });

  // SuperBass data
  const { data: superBassData } = useQuery({
    queryKey: ["superbass"],
    queryFn: () => axios.get(`${API}/api/data/superbass`).then((r) => r.data.data),
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
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-goat-gold drop-shadow-lg">
          GOAT Royalty Dashboard
        </h2>
        <p className="text-yellow-200/70 mt-2">
          Music Royalty Tracking & Analytics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `$${(stats.totalCombinedRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          { label: "Total Plays", value: (stats.totalPlays ?? 0).toLocaleString() },
          { label: "MLC Records", value: stats.mlcRecords ?? 0 },
          { label: "Artists", value: stats.uniqueArtists ?? 0 },
          { label: "Mechanical $", value: `$${(stats.totalMechanicalRoyalties ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          { label: "SoundExchange $", value: `$${(stats.totalSoundExchangeRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          { label: "SX Records", value: stats.soundExchangeRecords ?? 0 },
          { label: "Bass Tracks", value: stats.superBassTracks ?? 0 },
        ].map((card) => (
          <div key={card.label} className="bg-black/60 border border-yellow-900/50 rounded-lg p-4">
            <p className="text-yellow-200/70 text-xs uppercase tracking-wide">{card.label}</p>
            <p className="text-2xl font-bold text-goat-gold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Add Song Form */}
      <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
        <h3 className="text-xl font-bold text-goat-gold mb-4">Add New Song</h3>
        <form onSubmit={handleAddSong} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            placeholder="Song title..."
            className="bg-black/80 border border-yellow-900/50 rounded px-4 py-2 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold"
          />
          <input
            type="number"
            value={songPlays}
            onChange={(e) => setSongPlays(e.target.value)}
            placeholder="Plays"
            className="bg-black/80 border border-yellow-900/50 rounded px-4 py-2 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold"
          />
          <input
            type="number"
            value={songLikes}
            onChange={(e) => setSongLikes(e.target.value)}
            placeholder="Likes"
            className="bg-black/80 border border-yellow-900/50 rounded px-4 py-2 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold"
          />
          <button
            type="submit"
            className="bg-goat-gold text-black font-bold px-6 py-2 rounded hover:bg-yellow-400 transition"
          >
            Add Song
          </button>
        </form>
      </div>

      {/* Data Tabs */}
      <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {([
            { key: "streams", label: "Streaming Metrics" },
            { key: "mlc", label: "MLC Royalties" },
            { key: "soundexchange", label: "SoundExchange" },
            { key: "superbass", label: "SuperBass" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition ${
                tab === t.key
                  ? "bg-goat-gold text-black"
                  : "border border-yellow-900/50 text-yellow-200 hover:border-goat-gold"
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
                  className="text-xs text-yellow-200 border border-yellow-900/50 px-3 py-1 rounded hover:bg-goat-gold hover:text-black transition"
                >
                  Export CSV
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-yellow-900/50">
                  <th className="text-left py-2 text-yellow-200/70">Title</th>
                  <th className="text-right py-2 text-yellow-200/70">Plays</th>
                  <th className="text-right py-2 text-yellow-200/70">Likes</th>
                </tr>
              </thead>
              <tbody>
                {(songs ?? []).map((song: { id: string; title: string; plays: number; likes: number }) => (
                  <tr key={song.id} className="border-b border-yellow-900/20">
                    <td className="py-2 text-white">{song.title}</td>
                    <td className="py-2 text-right text-yellow-200">{song.plays.toLocaleString()}</td>
                    <td className="py-2 text-right text-yellow-200">{song.likes.toLocaleString()}</td>
                  </tr>
                ))}
                {(!songs || songs.length === 0) && (
                  <tr><td colSpan={3} className="py-4 text-center text-yellow-200/40">No songs yet.</td></tr>
                )}
              </tbody>
            </table>
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
                  className="text-xs text-yellow-200 border border-yellow-900/50 px-3 py-1 rounded hover:bg-goat-gold hover:text-black transition"
                >
                  Export CSV
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-yellow-900/50">
                  <th className="text-left py-2 text-yellow-200/70">Writer</th>
                  <th className="text-left py-2 text-yellow-200/70">ISRC</th>
                  <th className="text-left py-2 text-yellow-200/70">Source</th>
                  <th className="text-right py-2 text-yellow-200/70">Mechanical</th>
                </tr>
              </thead>
              <tbody>
                {(mlcData ?? []).map((row: { writer: string; isrc: string; source: string; mechanical: number }, i: number) => (
                  <tr key={i} className="border-b border-yellow-900/20">
                    <td className="py-2 text-white">{row.writer}</td>
                    <td className="py-2 text-yellow-200 font-mono text-xs">{row.isrc}</td>
                    <td className="py-2 text-yellow-200">{row.source}</td>
                    <td className="py-2 text-right text-goat-gold font-medium">${row.mechanical.toFixed(2)}</td>
                  </tr>
                ))}
                {(!mlcData || mlcData.length === 0) && (
                  <tr><td colSpan={4} className="py-4 text-center text-yellow-200/40">No MLC data.</td></tr>
                )}
              </tbody>
            </table>
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
                  className="text-xs text-yellow-200 border border-yellow-900/50 px-3 py-1 rounded hover:bg-goat-gold hover:text-black transition"
                >
                  Export CSV
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-yellow-900/50">
                  <th className="text-left py-2 text-yellow-200/70">Artist</th>
                  <th className="text-left py-2 text-yellow-200/70">ISRC</th>
                  <th className="text-right py-2 text-yellow-200/70">Mechanical</th>
                  <th className="text-right py-2 text-yellow-200/70">Plays</th>
                  <th className="text-right py-2 text-yellow-200/70">Likes</th>
                </tr>
              </thead>
              <tbody>
                {(sxData ?? []).map((row: { artist: string; isrc: string; mechanical: number; plays: number; likes: number }, i: number) => (
                  <tr key={i} className="border-b border-yellow-900/20">
                    <td className="py-2 text-white">{row.artist}</td>
                    <td className="py-2 text-yellow-200 font-mono text-xs">{row.isrc}</td>
                    <td className="py-2 text-right text-goat-gold font-medium">${row.mechanical.toFixed(2)}</td>
                    <td className="py-2 text-right text-yellow-200">{row.plays.toLocaleString()}</td>
                    <td className="py-2 text-right text-yellow-200">{row.likes.toLocaleString()}</td>
                  </tr>
                ))}
                {(!sxData || sxData.length === 0) && (
                  <tr><td colSpan={5} className="py-4 text-center text-yellow-200/40">No SoundExchange data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SuperBass */}
        {tab === "superbass" && (
          <div>
            <h3 className="text-lg font-bold text-yellow-300 mb-3">SuperBass Stats</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-yellow-900/50">
                  <th className="text-left py-2 text-yellow-200/70">Mix Name</th>
                  <th className="text-left py-2 text-yellow-200/70">Genre</th>
                  <th className="text-right py-2 text-yellow-200/70">BPM</th>
                  <th className="text-right py-2 text-yellow-200/70">Peak Loudness</th>
                </tr>
              </thead>
              <tbody>
                {(superBassData ?? []).map((mix: { name: string; genre?: string; bpm: number; loudness: number }, i: number) => (
                  <tr key={i} className="border-b border-yellow-900/20">
                    <td className="py-2 text-white">{mix.name}</td>
                    <td className="py-2 text-yellow-200">{mix.genre || "—"}</td>
                    <td className="py-2 text-right text-yellow-200">{mix.bpm}</td>
                    <td className="py-2 text-right text-goat-gold font-medium">{mix.loudness} dB</td>
                  </tr>
                ))}
                {(!superBassData || superBassData.length === 0) && (
                  <tr><td colSpan={4} className="py-4 text-center text-yellow-200/40">No SuperBass data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* The Truth About Music Monetization */}
      <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
        <h3 className="text-xl font-bold text-yellow-400 mb-3">The Truth About Music Monetization</h3>
        <p className="text-yellow-200/80 leading-relaxed text-sm">
          The Music Modernization Act (MMA) was supposed to help songwriters, but the truth is: it centralized
          control under the MLC, while the Department of Justice kept ASCAP and BMI shackled under outdated
          consent decrees. These PROs — ASCAP, BMI, SESAC, and GMR — sold out years ago. They've been licensing
          your work but haven't empowered you to collect everything you're owed.
        </p>
        <p className="text-yellow-200/80 leading-relaxed text-sm mt-3">
          Just registering a song in the MLC doesn't mean you'll get paid. If your data doesn't match exactly —
          like ISRCs or publisher info — your money goes to the "black box" or worse, to someone else. This app
          was built to expose that. If your portal says $0, don't blame yourself — blame the broken system we're here to fix.
        </p>
      </div>

      {/* PRO & Society Check Tools */}
      <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
        <h3 className="text-xl font-bold text-yellow-400 mb-3">PRO & Society Check Tools</h3>
        <div className="space-y-2">
          <a href="https://www.ascap.com/repertory" target="_blank" rel="noopener noreferrer" className="block text-yellow-200 underline hover:text-goat-gold transition">
            Search ASCAP Repertory
          </a>
          <a href="https://repertoire.bmi.com/" target="_blank" rel="noopener noreferrer" className="block text-yellow-200 underline hover:text-goat-gold transition">
            Search BMI Repertoire
          </a>
          <a href="https://www.soundexchange.com/tools/claim-your-account/" target="_blank" rel="noopener noreferrer" className="block text-yellow-200 underline hover:text-goat-gold transition">
            SoundExchange Artist/Publisher Claim Tool
          </a>
          <a href="https://www.themlc.com/" target="_blank" rel="noopener noreferrer" className="block text-yellow-200 underline hover:text-goat-gold transition">
            The MLC — Register Your Works
          </a>
        </div>
      </div>
    </div>
  );
}
