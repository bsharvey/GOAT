import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

interface Artist {
  id: string;
  name: string;
  email?: string;
  genre?: string;
  status: string;
  created_at: string;
}

export default function Artists() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["artists", search, page],
    queryFn: () =>
      axios
        .get(`${API}/api/artists`, {
          params: { search: search || undefined, limit, offset: page * limit },
        })
        .then((r) => r.data),
  });

  const artists: Artist[] = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-3xl font-bangers tracking-wide text-goat-gold">Artists</h2>
        <p className="text-yellow-200/50 text-sm mt-1">Manage your artist roster</p>
      </motion.div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search artists..."
          className="flex-1 bg-black/50 border border-yellow-900/40 rounded-xl px-5 py-3 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold transition"
        />
      </div>

      {/* Artists Table */}
      <div className="bg-black/50 border border-yellow-900/40 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-yellow-900/40">
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Name</th>
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Email</th>
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Genre</th>
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-yellow-200/60 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-yellow-200/40">Loading...</td>
                </tr>
              )}
              {!isLoading && artists.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-yellow-200/40">
                    No artists found. Add artists via the API.
                  </td>
                </tr>
              )}
              {artists.map((artist) => (
                <tr key={artist.id} className="border-b border-yellow-900/20 hover:bg-yellow-900/10 transition">
                  <td className="py-3 px-4 text-white font-medium">{artist.name}</td>
                  <td className="py-3 px-4 text-yellow-200/70">{artist.email || "\u2014"}</td>
                  <td className="py-3 px-4 text-yellow-200/70">{artist.genre || "\u2014"}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      artist.status === "active"
                        ? "bg-green-900/40 text-green-300 border border-green-800/30"
                        : "bg-yellow-900/40 text-yellow-300 border border-yellow-800/30"
                    }`}>
                      {artist.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-yellow-200/50 text-xs">
                    {new Date(artist.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-yellow-900/40">
            <span className="text-yellow-200/40 text-sm">{total} total</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded text-sm border border-yellow-900/40 text-yellow-200/70 disabled:opacity-30"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * limit >= total}
                className="px-3 py-1 rounded text-sm border border-yellow-900/40 text-yellow-200/70 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
