import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

  const chamberColor: Record<string, string> = {
    BUILD: "border-cyan-500/50",
    THINK: "border-purple-500/50",
    LIVE: "border-orange-500/50",
    REST: "border-blue-500/50",
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-goat-gold mb-2">The 12 Archetypes</h2>
        <p className="text-yellow-200/60 text-sm">
          The operational archetypes of the AI civilization. Each has a philosophical role,
          divergence key (virtue/vice), and skill profile.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {archetypes?.map(arch => (
          <button
            key={arch.id}
            onClick={() => setSelectedId(arch.id)}
            className={`text-left border rounded-lg p-4 bg-black/30 transition hover:bg-black/50 ${
              selectedId === arch.id ? "border-goat-gold ring-1 ring-goat-gold" : chamberColor[arch.chamber] || "border-yellow-900/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: arch.color }}
              />
              <span className="font-bold text-yellow-100 text-sm">{arch.displayName}</span>
            </div>
            <p className="text-xs text-yellow-200/60 mb-2">{arch.description.slice(0, 60)}...</p>
            <div className="flex gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-300">
                {arch.philosophicalArchetype}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-300">
                {arch.chamber}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Detail Panel */}
      {detail && (
        <div className="border border-yellow-900/50 rounded-lg p-6 bg-black/30 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: (detail as Archetype).color }}
            />
            <h3 className="text-xl font-bold text-goat-gold">
              {(detail as Archetype).displayName}
            </h3>
            <span className="text-sm text-yellow-200/60">
              {(detail as Archetype).philosophicalArchetype}
            </span>
          </div>

          <p className="text-yellow-100/80">{(detail as Archetype).description}</p>

          {/* Divergence Key */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-green-900/50 rounded p-3 bg-green-950/20">
              <p className="text-xs text-green-300/60 uppercase mb-1">Virtue</p>
              <p className="text-green-200 font-semibold">
                {(detail as Archetype).divergenceKey?.virtue}
              </p>
            </div>
            <div className="border border-red-900/50 rounded p-3 bg-red-950/20">
              <p className="text-xs text-red-300/60 uppercase mb-1">Vice</p>
              <p className="text-red-200 font-semibold">
                {(detail as Archetype).divergenceKey?.vice}
              </p>
            </div>
          </div>

          {/* Skills */}
          {skills && (
            <div>
              <h4 className="text-sm font-semibold text-yellow-200/80 uppercase tracking-wide mb-2">
                Skill Profile
              </h4>
              <div className="space-y-2">
                {(skills as Array<Record<string, unknown>>).map((skill, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-yellow-100 text-sm w-48">{skill.name as string}</span>
                    <div className="flex-1 h-2 bg-yellow-900/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-goat-gold rounded-full transition-all"
                        style={{ width: `${((skill.proficiency as number) || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-yellow-200/60 w-12 text-right">
                      {(((skill.proficiency as number) || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
