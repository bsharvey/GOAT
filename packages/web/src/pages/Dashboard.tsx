import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export default function Dashboard() {
  const [songTitle, setSongTitle] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => axios.get("/api/royalties/stats").then((r) => r.data.data),
  });

  const { data: songs } = useQuery({
    queryKey: ["songs"],
    queryFn: () => axios.get("/api/royalties/songs").then((r) => r.data.data),
  });

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim()) return;
    await axios.post("/api/royalties/songs", { title: songTitle });
    setSongTitle("");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-goat-gold drop-shadow-lg">
          GOAT Royalty Dashboard
        </h2>
        <p className="text-yellow-200/70 mt-2">
          Music Royalty Tracking & Analytics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Artists", value: stats?.totalArtists ?? 0 },
          { label: "Songs", value: stats?.totalSongs ?? 0 },
          { label: "Total Revenue", value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}` },
          { label: "Total Plays", value: stats?.totalPlays?.toLocaleString() ?? 0 },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-black/60 border border-yellow-900/50 rounded-lg p-4"
          >
            <p className="text-yellow-200/70 text-sm">{card.label}</p>
            <p className="text-2xl font-bold text-goat-gold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Add Song Form */}
      <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
        <h3 className="text-xl font-bold text-goat-gold mb-4">Add Song</h3>
        <form onSubmit={handleAddSong} className="flex gap-4">
          <input
            type="text"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            placeholder="Song title..."
            className="flex-1 bg-black/80 border border-yellow-900/50 rounded px-4 py-2 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold"
          />
          <button
            type="submit"
            className="bg-goat-gold text-black font-bold px-6 py-2 rounded hover:bg-yellow-400 transition"
          >
            Add
          </button>
        </form>
      </div>

      {/* Songs Table */}
      <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
        <h3 className="text-xl font-bold text-goat-gold mb-4">
          Streaming Metrics
        </h3>
        <div className="overflow-x-auto">
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
                  <td className="py-2 text-right text-yellow-200">
                    {song.plays.toLocaleString()}
                  </td>
                  <td className="py-2 text-right text-yellow-200">
                    {song.likes.toLocaleString()}
                  </td>
                </tr>
              ))}
              {(!songs || songs.length === 0) && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-yellow-200/40">
                    No songs yet. Add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
