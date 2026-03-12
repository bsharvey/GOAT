import { useState } from "react";
import axios from "axios";

export default function Agent() {
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"auto" | "ensemble">("auto");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setResponse("");
    try {
      const { data } = await axios.post("/api/agent/chat", { message, mode });
      setResponse(data.response);
    } catch (err) {
      setResponse("Error: " + (err instanceof Error ? err.message : "Failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold text-goat-gold">OmniLLM Agent</h2>
      <p className="text-yellow-200/70">
        Routes your queries to the best AI model automatically.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setMode("auto")}
            className={`px-4 py-1 rounded text-sm font-medium ${
              mode === "auto"
                ? "bg-goat-gold text-black"
                : "border border-yellow-900/50 text-yellow-200"
            }`}
          >
            Auto Route
          </button>
          <button
            type="button"
            onClick={() => setMode("ensemble")}
            className={`px-4 py-1 rounded text-sm font-medium ${
              mode === "ensemble"
                ? "bg-goat-gold text-black"
                : "border border-yellow-900/50 text-yellow-200"
            }`}
          >
            Ensemble Mode
          </button>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask anything..."
          rows={4}
          className="w-full bg-black/80 border border-yellow-900/50 rounded-lg px-4 py-3 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold resize-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-goat-gold text-black font-bold px-8 py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </form>

      {response && (
        <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
          <h3 className="text-sm font-medium text-yellow-200/70 mb-2">
            Response
          </h3>
          <div className="text-white whitespace-pre-wrap">{response}</div>
        </div>
      )}
    </div>
  );
}
