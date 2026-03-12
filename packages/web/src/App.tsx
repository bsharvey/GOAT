import { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Dashboard from "./pages/Dashboard.js";
import Security from "./pages/Security.js";
import Agent from "./pages/Agent.js";
import Agents from "./pages/Agents.js";
import Knowledge from "./pages/Knowledge.js";
import Council from "./pages/Council.js";
import Archetypes from "./pages/Archetypes.js";
import Decisions from "./pages/Decisions.js";
import Production from "./pages/Production.js";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard" },
  { path: "/production", label: "Production" },
  { path: "/agent", label: "OmniLLM" },
  { path: "/agents", label: "Agents" },
  { path: "/knowledge", label: "Knowledge" },
  { path: "/security", label: "APEX Security" },
  { path: "/council", label: "Council" },
  { path: "/archetypes", label: "Archetypes" },
  { path: "/decisions", label: "Decisions" },
];

export default function App() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-goat-dark">
      {/* Nav */}
      <nav className="nav-glass sticky top-0 z-50 border-b border-yellow-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/images/goat-logo2.png"
                alt="GOAT"
                className="w-10 h-10 rounded-lg object-cover ring-2 ring-yellow-900/50 group-hover:ring-goat-gold transition-all"
              />
              <span className="text-2xl font-bangers tracking-wider text-shimmer">
                GOAT
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-goat-gold/15 text-goat-gold"
                        : "text-yellow-200/70 hover:text-goat-gold hover:bg-yellow-900/20"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-yellow-200 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Nav */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden overflow-hidden"
              >
                <div className="flex flex-col gap-1 pt-3 pb-2">
                  {NAV_ITEMS.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          active
                            ? "bg-goat-gold/15 text-goat-gold"
                            : "text-yellow-200/70 hover:text-goat-gold hover:bg-yellow-900/20"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/production" element={<Production />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/security" element={<Security />} />
          <Route path="/council" element={<Council />} />
          <Route path="/archetypes" element={<Archetypes />} />
          <Route path="/decisions" element={<Decisions />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-yellow-900/30 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/goat-logo2.png" alt="" className="w-6 h-6 rounded object-cover opacity-60" />
            <span className="text-yellow-200/40 text-sm">GOAT Platform by DJ Speedy</span>
          </div>
          <span className="text-yellow-200/30 text-xs">Powered by OmniLLM</span>
        </div>
      </footer>
    </div>
  );
}
