import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

export default function Agent() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"auto" | "ensemble">("auto");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStream = useCallback(
    async (message: string) => {
      const controller = new AbortController();
      abortRef.current = controller;

      // Add placeholder assistant message
      const assistantIdx = messages.length + 1; // account for user message just added
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", timestamp: new Date(), streaming: true },
      ]);

      try {
        const url = `${API}/api/agent/stream?message=${encodeURIComponent(message)}&mode=${mode}`;
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok || !response.body) {
          throw new Error("Stream connection failed");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data = JSON.parse(line.slice(6));
                if (eventType === "chunk" && data.text) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.streaming) {
                      updated[updated.length - 1] = { ...last, content: last.content + data.text };
                    }
                    return updated;
                  });
                } else if (eventType === "done") {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last) {
                      updated[updated.length - 1] = { ...last, streaming: false };
                    }
                    return updated;
                  });
                } else if (eventType === "error") {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last) {
                      updated[updated.length - 1] = {
                        ...last,
                        content: data.error || "An error occurred",
                        streaming: false,
                      };
                    }
                    return updated;
                  });
                }
              } catch {
                // skip malformed events
              }
              eventType = "";
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.streaming) {
            updated[updated.length - 1] = {
              ...last,
              content: "Connection lost. Please try again.",
              streaming: false,
            };
          }
          return updated;
        });
      }
    },
    [mode, messages.length],
  );

  const handleFetch = useCallback(
    async (message: string) => {
      try {
        const { data } = await axios.post(`${API}/api/agent/chat`, { message, mode });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response, timestamp: new Date() },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I couldn't process that request. Please try again.",
            timestamp: new Date(),
          },
        ]);
      }
    },
    [mode],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    const msg = input;
    setInput("");
    setLoading(true);

    if (useStreaming) {
      await handleStream(msg);
    } else {
      await handleFetch(msg);
    }

    setLoading(false);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setLoading(false);
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.streaming) {
        updated[updated.length - 1] = { ...last, streaming: false };
      }
      return updated;
    });
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
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setUseStreaming(!useStreaming)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              useStreaming
                ? "bg-green-500/20 border border-green-500/40 text-green-300"
                : "border border-yellow-900/40 text-yellow-200/50"
            }`}
            title="Toggle streaming mode"
          >
            {useStreaming ? "Stream" : "Fetch"}
          </button>
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
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content}
                {msg.streaming && (
                  <span className="inline-block w-2 h-4 bg-goat-gold/60 ml-0.5 animate-pulse" />
                )}
              </p>
              <p className="text-xs text-yellow-200/20 mt-2">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </motion.div>
        ))}

        {loading && !messages[messages.length - 1]?.streaming && (
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
        {loading ? (
          <button
            type="button"
            onClick={handleStop}
            className="bg-red-500/80 text-white font-bold px-8 py-3 rounded-xl hover:bg-red-500 active:scale-[0.98] transition-all"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-goat-gold text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
