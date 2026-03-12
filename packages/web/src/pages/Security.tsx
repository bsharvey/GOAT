import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export default function Security() {
  const { data: threats } = useQuery({
    queryKey: ["threats"],
    queryFn: () => axios.get("/api/security/threats").then((r) => r.data.data),
  });

  const startScan = async () => {
    await axios.post("/api/security/scan-email");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold text-goat-gold">APEX Security</h2>
      <p className="text-yellow-200/70">
        Threat monitoring, email scanning, and evidence management.
      </p>

      <div className="flex gap-4">
        <button
          onClick={startScan}
          className="bg-goat-red text-white font-bold px-6 py-2 rounded hover:bg-red-500 transition"
        >
          Scan Email
        </button>
        <button className="border border-yellow-900/50 text-yellow-200 px-6 py-2 rounded hover:border-goat-gold transition">
          Dark Web Search
        </button>
        <button className="border border-yellow-900/50 text-yellow-200 px-6 py-2 rounded hover:border-goat-gold transition">
          Upload Evidence
        </button>
      </div>

      <div className="bg-black/60 border border-yellow-900/50 rounded-lg p-6">
        <h3 className="text-xl font-bold text-goat-gold mb-4">
          Threat Monitor
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-yellow-900/50">
                <th className="text-left py-2 text-yellow-200/70">Type</th>
                <th className="text-left py-2 text-yellow-200/70">Level</th>
                <th className="text-left py-2 text-yellow-200/70">
                  Description
                </th>
                <th className="text-left py-2 text-yellow-200/70">Status</th>
              </tr>
            </thead>
            <tbody>
              {(threats ?? []).map(
                (t: {
                  id: string;
                  type: string;
                  threatLevel: string;
                  description: string;
                  status: string;
                }) => (
                  <tr key={t.id} className="border-b border-yellow-900/20">
                    <td className="py-2 text-white">{t.type}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          t.threatLevel === "critical"
                            ? "bg-red-900 text-red-200"
                            : t.threatLevel === "high"
                              ? "bg-orange-900 text-orange-200"
                              : "bg-yellow-900 text-yellow-200"
                        }`}
                      >
                        {t.threatLevel}
                      </span>
                    </td>
                    <td className="py-2 text-yellow-200">{t.description}</td>
                    <td className="py-2 text-yellow-200/70">{t.status}</td>
                  </tr>
                )
              )}
              {(!threats || threats.length === 0) && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-4 text-center text-yellow-200/40"
                  >
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
