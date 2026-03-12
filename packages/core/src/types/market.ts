// Market analysis and AI mastering types

export interface MarketAnalysis {
  id: string;
  genre: string;
  trends: GenreTrend[];
  platformInsights: PlatformInsight[];
  competitors: CompetitorData[];
  audienceDemographics: Demographics;
  predictions: MarketPrediction[];
  analyzedAt: Date;
}

export interface GenreTrend {
  genre: string;
  growth: number; // percentage
  hotTracks: number;
  avgRevenuePerTrack: number;
  direction: "up" | "down" | "stable";
}

export interface PlatformInsight {
  platform: string;
  marketShare: number;
  payPerStream: number;
  growthRate: number;
  bestGenres: string[];
}

export interface CompetitorData {
  name: string;
  monthlyListeners: number;
  topGenres: string[];
  avgStreams: number;
  growthRate: number;
}

export interface Demographics {
  ageGroups: Record<string, number>;
  topRegions: { region: string; percentage: number }[];
  genderSplit: Record<string, number>;
  listeningHours: Record<string, number>;
}

export interface MarketPrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  timeframe: string;
}

export interface AIMasteringJob {
  id: string;
  trackName: string;
  status: "pending" | "processing" | "completed" | "failed";
  settings: MasteringSettings;
  qualityScore?: number;
  issues?: string[];
  referenceTrack?: string;
  outputUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface MasteringSettings {
  targetLoudness: number; // LUFS
  eqProfile: "flat" | "warm" | "bright" | "bass-heavy" | "custom";
  compression: "light" | "medium" | "heavy";
  stereoWidth: number; // 0-200%
  limiterCeiling: number; // dBFS
}
