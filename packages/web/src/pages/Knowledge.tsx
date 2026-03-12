import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-goat-gold">Knowledge Base</h2>
        <p className="text-yellow-200/70 mt-1">
          RAG-powered knowledge system with music industry expertise.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-4">
          <p className="text-yellow-200/70 text-xs uppercase">Documents</p>
          <p className="text-2xl font-bold text-goat-gold">{stats?.totalDocuments ?? 0}</p>
        </div>
        <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-4">
          <p className="text-yellow-200/70 text-xs uppercase">Cache</p>
          <p className="text-2xl font-bold text-goat-gold">{stats?.cacheSize ?? 0}</p>
        </div>
        <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-4">
          <p className="text-yellow-200/70 text-xs uppercase">Topics</p>
          <p className="text-2xl font-bold text-goat-gold">{stats?.topics?.length ?? 0}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-goat-gold mb-3">Search Knowledge</h3>
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search royalty knowledge base..."
            className="flex-1 bg-black/80 border border-yellow-900/50 rounded px-4 py-2 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-goat-gold text-black font-bold px-6 py-2 rounded hover:bg-yellow-400 transition disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {results.length > 0 && (
          <div className="mt-4 space-y-3">
            {results.map((r, i) => (
              <div key={i} className="bg-black/80 border border-yellow-900/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-yellow-900/50 text-yellow-200 px-2 py-0.5 rounded">
                    {r.metadata.topic || "general"}
                  </span>
                  <span className="text-xs text-yellow-200/50">
                    Score: {(r.score * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-white text-sm">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Document */}
      <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-goat-gold mb-3">Add Knowledge</h3>
        <form onSubmit={handleAddDoc} className="space-y-4">
          <input
            type="text"
            value={docTopic}
            onChange={(e) => setDocTopic(e.target.value)}
            placeholder="Topic (e.g. mechanical-royalties, contracts)"
            className="w-full bg-black/80 border border-yellow-900/50 rounded px-4 py-2 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold"
          />
          <textarea
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            placeholder="Paste knowledge content here..."
            rows={5}
            className="w-full bg-black/80 border border-yellow-900/50 rounded-lg px-4 py-3 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold resize-none"
          />
          <button
            type="submit"
            className="bg-goat-gold text-black font-bold px-6 py-2 rounded hover:bg-yellow-400 transition"
          >
            Add to Knowledge Base
          </button>
        </form>
      </div>

      {/* Topics */}
      {stats?.topics && stats.topics.length > 0 && (
        <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-goat-gold mb-3">Topics</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topics.map((topic: string) => (
              <span key={topic} className="bg-yellow-900/30 text-yellow-200 px-3 py-1 rounded-full text-sm">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
