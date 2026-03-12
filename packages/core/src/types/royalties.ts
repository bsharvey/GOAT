export interface Artist {
  id: string;
  name: string;
  proAffiliation: "ASCAP" | "BMI" | "SESAC" | "GMR" | "NONE";
  email?: string;
  createdAt: Date;
}

export interface Song {
  id: string;
  title: string;
  artistId: string;
  isrc?: string;
  plays: number;
  likes: number;
  createdAt: Date;
}

export interface RoyaltyRecord {
  id: string;
  songId: string;
  artistId: string;
  source: string;
  amount: number;
  currency: string;
  period: string;
  isrc?: string;
  createdAt: Date;
}

export interface StreamingMetrics {
  songId: string;
  platform: string;
  plays: number;
  saves: number;
  shares: number;
  revenue: number;
  period: string;
}
