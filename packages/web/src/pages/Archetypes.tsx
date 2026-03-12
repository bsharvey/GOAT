import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

interface Archetype {
  id: string;
  displayName: string;
  description: string;
  philosophicalArchetype: string;
  chamber: string;
  color: string;
  hue: number;
  icon: string;
  divergenceKey: { virtue: string; vice: string };
  skills: string[];
}

const chamberStyles: Record<string, { border: string; bg: string; label: string }> = {
  BUILD: { border: "border-cyan-500/40", bg: "bg-cyan-950/20", label: "text-cyan-400" },
  THINK: { border: "border-purple-500/40", bg: "bg-purple-950/20", label: "text-purple-400" },
  LIVE: { border: "border-orange-500/40", bg: "bg-orange-950/20", label: "text-orange-400" },
  REST: { border: "border-blue-500/40", bg: "bg-blue-950/20", label: "text-blue-400" },
};

const philosophyColors: Record<string, string> = {
  Guardian: "bg-blue-900/40 text-blue-300",
  Builder: "bg-cyan-900/40 text-cyan-300",
  Redeemer: "bg-rose-900/40 text-rose-300",
  Arbiter: "bg-amber-900/40 text-amber-300",
  Mirrorwalker: "bg-violet-900/40 text-violet-300",
};

export default function Archetypes() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: archetypes } = useQuery<Archetype[]>({
    queryKey: ["archetypes"],
    queryFn: () => axios.get(`${API}/api/archetypes`).then(r => r.data.archetypes),
  });

  const { data: detail } = useQuery({
    queryKey: ["archetype", selectedId],
    queryFn: () => axios.get(`${API}/api/archetypes/${selectedId}`).then(r => r.data.archetype),
    enabled: !!selectedId,
  });

  const { data: skills } = useQuery({
    queryKey: ["archetypeSkills", selectedId],
    queryFn: () => axios.get(`${API}/api/archetypes/${selectedId}/skills`).then(r => r.data.skills),
    enabled: !!selectedId,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-yellow-900/40 bg-gradient-to-br from-yellow-950/20 via-black/60 to-purple-950/10 p-8"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-goat-gold/5 rounded-full blur-3xl" />
        <div className="flex items-center gap-6">
          <img
            src="/images/goat-logo-alt2.png"
            alt="GOAT Archetypes"
            className="hidden md:block w-24 h-24 rounded-xl object-cover ring-2 ring-yellow-900/40"
          />
          <div>
            <h2 className="text-3xl font-bangers tracking-wide text-goat-gold mb-2">The 12 Archetypes</h2>
            <p className="text-yellow-200/60 text-sm max-w-xl">
              The operational archetypes of the AI civilization. Each has a philosophical role,
              divergence key (virtue/vice), and skill profile.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {archetypes?.map((arch, i) => {
          const chamber = chamberStyles[arch.chamber] ?? chamberStyles.BUILD!;
          const isSelected = selectedId === arch.id;
          return (
            <motion.button
              key={arch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelectedId(isSelected ? null : arch.id)}
              className={`text-left rounded-xl p-4 transition-all card-glow ${chamber!.bg} ${
                isSelected
                  ? "border-2 border-goat-gold ring-1 ring-goat-gold/30 shadow-lg shadow-yellow-900/20"
                  : `border ${chamber!.border} hover:scale-[1.02]`
              }`}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-4 h-4 rounded-full ring-2 ring-white/10"
                  style={{ backgroundColor: arch.color }}
                />
                <span className="font-bold text-yellow-100 text-sm">{arch.displayName}</span>
              </div>
              <p className="text-xs text-yellow-200/50 mb-3 line-clamp-2">{arch.description.slice(0, 70)}...</p>
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full ${philosophyColors[arch.philosophicalArchetype] || "bg-yellow-900/30 text-yellow-300"}`}>
                  {arch.philosophicalArchetype}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${chamber!.border} ${chamber!.label} bg-black/30`}>
                  {arch.chamber}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {detail && selectedId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-yellow-900/40 rounded-xl p-6 bg-black/40 space-y-6"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full ring-2 ring-white/10"
                style={{ backgroundColor: (detail as Archetype).color }}
              />
              <h3 className="text-xl font-bold text-goat-gold">
                {(detail as Archetype).displayName}
              </h3>
              <span className={`text-sm px-2.5 py-0.5 rounded-full ${philosophyColors[(detail as Archetype).philosophicalArchetype] || ""}`}>
                {(detail as Archetype).philosophicalArchetype}
              </span>
            </div>

            <p className="text-yellow-100/70 leading-relaxed">{(detail as Archetype).description}</p>

            {/* Divergence Key */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-green-800/40 rounded-xl p-4 bg-green-950/15">
                <p className="text-xs text-green-400/70 uppercase tracking-wider mb-1.5">Virtue</p>
                <p className="text-green-200 font-semibold text-lg">
                  {(detail as Archetype).divergenceKey?.virtue}
                </p>
              </div>
              <div className="border border-red-800/40 rounded-xl p-4 bg-red-950/15">
                <p className="text-xs text-red-400/70 uppercase tracking-wider mb-1.5">Vice</p>
                <p className="text-red-200 font-semibold text-lg">
                  {(detail as Archetype).divergenceKey?.vice}
                </p>
              </div>
            </div>

            {/* Skills */}
            {skills && (
              <div>
                <h4 className="text-sm font-semibold text-yellow-200/70 uppercase tracking-wider mb-3">
                  Skill Profile
                </h4>
                <div className="space-y-2.5">
                  {(skills as Array<Record<string, unknown>>).map((skill, i) => {
                    const proficiency = (skill.proficiency as number) || 0;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-yellow-100/80 text-sm w-48 truncate">{skill.name as string}</span>
                        <div className="flex-1 h-2.5 bg-yellow-900/20 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${proficiency * 100}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05 }}
                            className="h-full bg-gradient-to-r from-goat-gold to-yellow-300 rounded-full"
                          />
                        </div>
                        <span className="text-xs text-yellow-200/50 w-12 text-right font-mono">
                          {(proficiency * 100).toFixed(0)}%
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
