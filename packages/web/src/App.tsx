import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard.js";
import Security from "./pages/Security.js";
import Agent from "./pages/Agent.js";

export default function App() {
  return (
    <div className="min-h-screen bg-goat-dark">
      <nav className="border-b border-yellow-900/50 px-6 py-4">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold text-goat-gold">GOAT</h1>
          <div className="flex gap-6 text-sm">
            <a href="/" className="text-yellow-200 hover:text-goat-gold">
              Dashboard
            </a>
            <a href="/agent" className="text-yellow-200 hover:text-goat-gold">
              OmniLLM
            </a>
            <a href="/security" className="text-yellow-200 hover:text-goat-gold">
              APEX Security
            </a>
          </div>
        </div>
      </nav>
      <main className="p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/security" element={<Security />} />
        </Routes>
      </main>
    </div>
  );
}
