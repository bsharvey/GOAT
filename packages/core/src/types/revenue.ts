// Revenue tracking — platform-level analytics

export interface PlatformRevenue {
  platform: string;
  streams: number;
  downloads: number;
  revenue: number;
  growth: number; // percentage
  period: string;
}

export interface RevenueSnapshot {
  id: string;
  artistId: string;
  totalRevenue: number;
  platforms: PlatformRevenue[];
  dateRange: { start: string; end: string };
  predictions?: RevenuePrediction[];
  createdAt: Date;
}

export interface RevenuePrediction {
  platform: string;
  predictedRevenue: number;
  confidence: number;
  period: string;
}

export interface MechanicalRoyalty {
  writer: string;
  isrc: string;
  mechanical: number;
  publisher?: string;
  source: "MLC" | "HFA" | "DIRECT";
}

export interface SoundExchangeRecord {
  artist: string;
  isrc: string;
  mechanical: number;
  plays: number;
  likes: number;
  period?: string;
}

export interface SuperBassStats {
  name: string;
  bpm: number;
  loudness: number; // dB
  genre?: string;
  duration?: number; // seconds
}
