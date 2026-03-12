import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard.js";
import Security from "./pages/Security.js";
import Agent from "./pages/Agent.js";
import Agents from "./pages/Agents.js";
import Knowledge from "./pages/Knowledge.js";

export default function App() {
  return (
    <div className="min-h-screen bg-goat-dark">
      <nav className="border-b border-yellow-900/50 px-6 py-4">
        <div className="flex items-center gap-8 flex-wrap">
          <h1 className="text-2xl font-bold text-goat-gold">GOAT</h1>
          <div className="flex gap-6 text-sm">
            <a href="/" className="text-yellow-200 hover:text-goat-gold transition">
              Dashboard
            </a>
            <a href="/agent" className="text-yellow-200 hover:text-goat-gold transition">
              OmniLLM
            </a>
            <a href="/agents" className="text-yellow-200 hover:text-goat-gold transition">
              Agents
            </a>
            <a href="/knowledge" className="text-yellow-200 hover:text-goat-gold transition">
              Knowledge
            </a>
            <a href="/security" className="text-yellow-200 hover:text-goat-gold transition">
              APEX Security
            </a>
          </div>
        </div>
      </nav>
      <main className="p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/security" element={<Security />} />
        </Routes>
      </main>
    </div>
  );
}
