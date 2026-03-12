import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

export default function Knowledge() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docTopic, setDocTopic] = useState("");
  const [results, setResults] = useState<{ content: string; metadata: Record<string, string>; score: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["ragStats"],
    queryFn: () => axios.get(`${API}/api/rag/stats`).then((r) => r.data),
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/rag/query`, { query, topK: 5 });
      setResults(data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docContent.trim()) return;

    await axios.post(`${API}/api/rag/documents`, {
      content: docContent,
      metadata: { topic: docTopic || "general" },
    });
    setDocContent("");
    setDocTopic("");
    queryClient.invalidateQueries({ queryKey: ["ragStats"] });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-bangers tracking-wide text-goat-gold">Knowledge Base</h2>
        <p className="text-yellow-200/50 text-sm mt-1">
          Search and manage your music industry knowledge library
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Documents", value: stats?.totalDocuments ?? 0 },
          { label: "Cached", value: stats?.cacheSize ?? 0 },
          { label: "Topics", value: stats?.topics?.length ?? 0 },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-black/40 border border-yellow-900/40 rounded-xl p-4 card-glow"
          >
            <p className="text-yellow-200/50 text-xs uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-goat-gold mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-black/40 border border-yellow-900/40 rounded-xl p-6">
        <h3 className="text-lg font-bold text-yellow-100 mb-4">Search Knowledge</h3>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search royalties, contracts, industry knowledge..."
            className="flex-1 bg-black/50 border border-yellow-900/40 rounded-xl px-4 py-2.5 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold focus:ring-1 focus:ring-goat-gold/20 transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-goat-gold text-black font-bold px-6 py-2.5 rounded-xl hover:bg-yellow-400 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? "..." : "Search"}
          </button>
        </form>

        {results.length > 0 && (
          <div className="mt-4 space-y-3">
            {results.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-black/50 border border-yellow-900/30 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-yellow-900/40 text-yellow-200 px-2.5 py-0.5 rounded-full">
                    {r.metadata.topic || "general"}
                  </span>
                  <span className="text-xs text-yellow-200/30">
                    {(r.score * 100).toFixed(0)}% match
                  </span>
                </div>
                <p className="text-white text-sm leading-relaxed">{r.content}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Document */}
      <div className="bg-black/40 border border-yellow-900/40 rounded-xl p-6">
        <h3 className="text-lg font-bold text-yellow-100 mb-4">Add Knowledge</h3>
        <form onSubmit={handleAddDoc} className="space-y-4">
          <input
            type="text"
            value={docTopic}
            onChange={(e) => setDocTopic(e.target.value)}
            placeholder="Topic (e.g. mechanical-royalties, contracts)"
            className="w-full bg-black/50 border border-yellow-900/40 rounded-xl px-4 py-2.5 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold focus:ring-1 focus:ring-goat-gold/20 transition"
          />
          <textarea
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            placeholder="Paste knowledge content here..."
            rows={5}
            className="w-full bg-black/50 border border-yellow-900/40 rounded-xl px-4 py-3 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold focus:ring-1 focus:ring-goat-gold/20 transition resize-none"
          />
          <button
            type="submit"
            className="bg-goat-gold text-black font-bold px-6 py-2.5 rounded-xl hover:bg-yellow-400 active:scale-[0.98] transition-all"
          >
            Add to Knowledge Base
          </button>
        </form>
      </div>

      {/* Topics */}
      {stats?.topics && stats.topics.length > 0 && (
        <div className="bg-black/40 border border-yellow-900/40 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-100 mb-4">Topics</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topics.map((topic: string) => (
              <span key={topic} className="bg-yellow-900/30 text-yellow-200 px-4 py-1.5 rounded-full text-sm border border-yellow-900/20">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
