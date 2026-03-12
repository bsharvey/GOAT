import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function Agent() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"auto" | "ensemble">("auto");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${API}/api/agent/chat`, { message: input, mode });
      const assistantMessage: Message = { role: "assistant", content: data.response, timestamp: new Date() };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I couldn't process that request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bangers tracking-wide text-goat-gold">AI Assistant</h2>
          <p className="text-yellow-200/50 text-sm mt-1">
            Intelligent routing to the best AI model for your question
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("auto")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "auto"
                ? "bg-goat-gold text-black shadow-lg shadow-yellow-900/20"
                : "border border-yellow-900/40 text-yellow-200/70 hover:border-goat-gold"
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => setMode("ensemble")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "ensemble"
                ? "bg-goat-gold text-black shadow-lg shadow-yellow-900/20"
                : "border border-yellow-900/40 text-yellow-200/70 hover:border-goat-gold"
            }`}
          >
            Multi-Model
          </button>
        </div>
      </motion.div>

      {/* Chat Area */}
      <div className="bg-black/40 border border-yellow-900/40 rounded-xl min-h-[400px] max-h-[600px] overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <img src="/images/goat-logo2.png" alt="" className="w-16 h-16 rounded-xl object-cover opacity-30 mb-4" />
            <p className="text-yellow-200/30 text-lg">Ask me anything about music, royalties, contracts, or strategy</p>
            <p className="text-yellow-200/20 text-sm mt-2">Your questions are analyzed and routed to the best AI model automatically</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-goat-gold/15 border border-goat-gold/30 text-yellow-100"
                  : "bg-black/50 border border-yellow-900/30 text-yellow-100/80"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              <p className="text-xs text-yellow-200/20 mt-2">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </motion.div>
        ))}

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-black/50 border border-yellow-900/30 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-yellow-200/50 text-sm">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Thinking...
              </div>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything..."
          className="flex-1 bg-black/50 border border-yellow-900/40 rounded-xl px-5 py-3 text-white placeholder:text-yellow-200/30 focus:outline-none focus:border-goat-gold focus:ring-1 focus:ring-goat-gold/20 transition"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-goat-gold text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
