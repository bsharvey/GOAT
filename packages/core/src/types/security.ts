export type ThreatLevel = "critical" | "high" | "medium" | "low" | "info";

export interface Threat {
  id: string;
  userId: string;
  type: "email" | "darkweb" | "phishing" | "malware" | "other";
  source: string;
  description: string;
  threatLevel: ThreatLevel;
  data: Record<string, unknown>;
  status: "new" | "investigating" | "resolved" | "false_positive";
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityScanResult {
  scanId: string;
  userId: string;
  scanType: "email" | "darkweb" | "full";
  threats: Threat[];
  scannedAt: Date;
  durationMs: number;
}

export interface Evidence {
  id: string;
  userId: string;
  threatId?: string;
  filename: string;
  mimeType: string;
  storageKey: string;
  description: string;
  caseNumber?: string;
  uploadedAt: Date;
}
