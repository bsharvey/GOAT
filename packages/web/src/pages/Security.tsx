import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

export default function Security() {
  const { data: threats } = useQuery({
    queryKey: ["threats"],
    queryFn: () => axios.get(`${API}/api/security/threats`).then((r) => r.data.data),
  });

  const startScan = async () => {
    await axios.post(`${API}/api/security/scan-email`);
  };

  const threatCount = threats?.length ?? 0;
  const criticalCount = threats?.filter((t: { threatLevel: string }) => t.threatLevel === "critical").length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-red-900/30 bg-gradient-to-br from-red-950/20 via-black/60 to-black/80 p-8"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
        <div className="relative">
          <h2 className="text-3xl font-bangers tracking-wide text-goat-gold mb-2">Security Center</h2>
          <p className="text-yellow-200/50 text-sm max-w-xl">
            Threat monitoring, email scanning, and digital security management
          </p>
          <div className="flex gap-3 mt-4">
            <span className={`text-xs px-3 py-1 rounded-full border ${
              criticalCount > 0
                ? "bg-red-900/40 text-red-300 border-red-800/30"
                : "bg-green-900/40 text-green-300 border-green-800/30"
            }`}>
              {criticalCount > 0 ? `${criticalCount} Critical` : "All Clear"}
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-yellow-900/40 text-yellow-300 border border-yellow-800/30">
              {threatCount} Total Threats
            </span>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={startScan}
          className="flex items-center gap-3 bg-red-900/20 border border-red-800/30 text-red-300 font-bold px-6 py-4 rounded-xl hover:bg-red-900/30 transition-all group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Scan Email
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-3 border border-yellow-900/40 text-yellow-200 font-bold px-6 py-4 rounded-xl hover:border-goat-gold hover:text-goat-gold transition-all group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Dark Web Search
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 border border-yellow-900/40 text-yellow-200 font-bold px-6 py-4 rounded-xl hover:border-goat-gold hover:text-goat-gold transition-all group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload Evidence
        </motion.button>
      </div>

      {/* Threat Monitor */}
      <div className="bg-black/40 border border-yellow-900/40 rounded-xl p-6">
        <h3 className="text-lg font-bold text-yellow-100 mb-4">Threat Monitor</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-yellow-900/40">
                <th className="text-left py-3 text-yellow-200/60 font-medium">Type</th>
                <th className="text-left py-3 text-yellow-200/60 font-medium">Level</th>
                <th className="text-left py-3 text-yellow-200/60 font-medium">Description</th>
                <th className="text-left py-3 text-yellow-200/60 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(threats ?? []).map(
                (t: { id: string; type: string; threatLevel: string; description: string; status: string }) => (
                  <tr key={t.id} className="border-b border-yellow-900/20 hover:bg-yellow-900/10 transition">
                    <td className="py-3 text-white">{t.type}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        t.threatLevel === "critical"
                          ? "bg-red-900/40 text-red-300"
                          : t.threatLevel === "high"
                            ? "bg-orange-900/40 text-orange-300"
                            : "bg-yellow-900/40 text-yellow-300"
                      }`}>
                        {t.threatLevel}
                      </span>
                    </td>
                    <td className="py-3 text-yellow-200/70">{t.description}</td>
                    <td className="py-3">
                      <span className="text-yellow-200/50 text-xs">{t.status}</span>
                    </td>
                  </tr>
                )
              )}
              {(!threats || threats.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-yellow-200/30">
                    No threats detected. Run a scan to check.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
