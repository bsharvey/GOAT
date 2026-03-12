import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

interface Genre { name: string; tracks: number }
interface Project { name: string; type: string; artist: string }
interface Tool { name: string; type?: string; version?: string; platform?: string[]; format?: string }

export default function Production() {
  const { data: genres } = useQuery({
    queryKey: ["catalogGenres"],
    queryFn: () => axios.get(`${API}/api/catalog/genres`).then((r) => r.data),
  });

  const { data: tools } = useQuery({
    queryKey: ["catalogTools"],
    queryFn: () => axios.get(`${API}/api/catalog/tools`).then((r) => r.data),
  });

  const { data: projects } = useQuery({
    queryKey: ["catalogProjects"],
    queryFn: () => axios.get(`${API}/api/catalog/projects`).then((r) => r.data),
  });

  const toolData = tools?.tools;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-goat-gold drop-shadow-lg" style={{ fontFamily: "'Bangers', cursive" }}>
          Speedy Productions
        </h2>
        <p className="text-yellow-200/70 mt-2">
          Music Catalog, Production Tools & Sample Library
        </p>
      </div>

      {/* Catalog Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-4">
          <p className="text-yellow-200/70 text-xs uppercase">Total Tracks</p>
          <p className="text-3xl font-bold text-goat-gold">{genres?.totalTracks?.toLocaleString() ?? 0}</p>
        </div>
        <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-4">
          <p className="text-yellow-200/70 text-xs uppercase">Genres</p>
          <p className="text-3xl font-bold text-goat-gold">{genres?.genres?.length ?? 0}</p>
        </div>
        <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-4">
          <p className="text-yellow-200/70 text-xs uppercase">Projects</p>
          <p className="text-3xl font-bold text-goat-gold">{projects?.projects?.length ?? 0}</p>
        </div>
        <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-4">
          <p className="text-yellow-200/70 text-xs uppercase">Sync Ready</p>
          <p className="text-3xl font-bold text-green-400">YES</p>
        </div>
      </div>

      {/* Active Projects */}
      {projects?.projects && (
        <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
          <h3 className="text-xl font-bold text-goat-gold mb-4">Active Projects</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects.projects.map((p: Project, i: number) => (
              <div key={i} className="bg-black/80 border border-yellow-900/30 rounded-lg p-4">
                <h4 className="text-white font-bold">{p.name}</h4>
                <p className="text-yellow-200/70 text-sm">{p.artist}</p>
                <span className="text-xs bg-yellow-900/40 text-yellow-200 px-2 py-0.5 rounded mt-2 inline-block">{p.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genre Catalog */}
      <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
        <h3 className="text-xl font-bold text-goat-gold mb-4">Sync Catalog by Genre</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {(genres?.genres ?? []).map((g: Genre, i: number) => (
            <div key={i} className="flex justify-between items-center bg-black/80 border border-yellow-900/20 rounded px-3 py-2">
              <span className="text-white text-sm truncate mr-2">{g.name}</span>
              <span className="text-goat-gold font-bold text-sm whitespace-nowrap">{g.tracks}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Production Toolkit */}
      {toolData && (
        <>
          {/* DAWs */}
          <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-goat-gold mb-4">DAWs</h3>
            <div className="grid grid-cols-2 gap-3">
              {toolData.daws?.map((d: Tool, i: number) => (
                <div key={i} className="bg-black/80 border border-yellow-900/30 rounded-lg p-4">
                  <h4 className="text-white font-bold">{d.name}</h4>
                  {d.version && <p className="text-yellow-200/70 text-sm">v{d.version}</p>}
                  {d.platform && <p className="text-yellow-200/50 text-xs">{d.platform.join(", ")}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Plugins Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mastering */}
            <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-purple-400 mb-3">Mastering</h3>
              {toolData.plugins?.mastering?.map((p: Tool, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-yellow-900/20">
                  <span className="text-white text-sm">{p.name}</span>
                  <span className="text-yellow-200/50 text-xs">{p.type}</span>
                </div>
              ))}
            </div>

            {/* Instruments */}
            <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-400 mb-3">Instruments</h3>
              {toolData.plugins?.instruments?.map((p: Tool, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-yellow-900/20">
                  <span className="text-white text-sm">{p.name}</span>
                  <span className="text-yellow-200/50 text-xs">{p.type}</span>
                </div>
              ))}
            </div>

            {/* Effects */}
            <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-400 mb-3">Effects</h3>
              {toolData.plugins?.effects?.map((p: Tool, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-yellow-900/20">
                  <span className="text-white text-sm">{p.name}</span>
                  <span className="text-yellow-200/50 text-xs">{p.type}</span>
                </div>
              ))}
            </div>

            {/* Video/Visual */}
            <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-pink-400 mb-3">Video & Visual</h3>
              {toolData.plugins?.video?.map((p: Tool, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-yellow-900/20">
                  <span className="text-white text-sm">{p.name}</span>
                  <span className="text-yellow-200/50 text-xs">{p.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Packs */}
          <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-goat-gold mb-4">Sample Library</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {toolData.samplePacks?.map((s: Tool, i: number) => (
                <div key={i} className="bg-black/80 border border-yellow-900/30 rounded-lg p-3">
                  <h4 className="text-white text-sm font-medium">{s.name}</h4>
                  <span className="text-xs bg-yellow-900/40 text-yellow-200 px-2 py-0.5 rounded mt-1 inline-block">{s.format}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
