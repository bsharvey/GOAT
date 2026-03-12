/**
 * CSV Data Service — Import/Export royalty data
 *
 * Handles CSV parsing for MLC data, SoundExchange records,
 * song stats, and general royalty exports.
 */

import type { MechanicalRoyalty, SoundExchangeRecord, SuperBassStats } from "@goat/core";

// In-memory data stores (swap with DB later)
let mlcData: MechanicalRoyalty[] = [
  { writer: "DJ Speedy", isrc: "US-GOA-25-00001", mechanical: 1245.67, source: "MLC" },
  { writer: "DJ Speedy", isrc: "US-GOA-25-00002", mechanical: 876.43, source: "MLC" },
  { writer: "Waka", isrc: "US-GOA-25-00003", mechanical: 2341.89, source: "MLC" },
  { writer: "DJ Speedy", isrc: "US-GOA-25-00004", mechanical: 543.21, source: "HFA" },
  { writer: "Money Penny", isrc: "US-GOA-25-00005", mechanical: 1678.90, source: "MLC" },
];

let soundExchangeData: SoundExchangeRecord[] = [
  { artist: "DJ Speedy", isrc: "US-GOA-25-00001", mechanical: 456.78, plays: 125000, likes: 8900 },
  { artist: "DJ Speedy", isrc: "US-GOA-25-00002", mechanical: 234.56, plays: 87000, likes: 6200 },
  { artist: "Waka", isrc: "US-GOA-25-00003", mechanical: 789.12, plays: 342000, likes: 24500 },
  { artist: "DJ Speedy", isrc: "US-GOA-25-00004", mechanical: 123.45, plays: 45000, likes: 3100 },
  { artist: "Money Penny", isrc: "US-GOA-25-00005", mechanical: 567.89, plays: 198000, likes: 14200 },
];

let superBassData: SuperBassStats[] = [
  { name: "Bassline Inferno", bpm: 130, loudness: -5.2, genre: "EDM" },
  { name: "Deep Sub Earthquake", bpm: 140, loudness: -4.8, genre: "Dubstep" },
  { name: "808 Heroic", bpm: 120, loudness: -6.0, genre: "Hip-Hop" },
  { name: "GOAT Mode Beat", bpm: 145, loudness: -3.9, genre: "Trap" },
  { name: "Royalty Rhythm", bpm: 110, loudness: -7.1, genre: "R&B" },
];

export class CSVService {
  // Parse CSV string into objects
  static parseCSV<T>(csv: string): T[] {
    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0]!.split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = values[i] || "";
      });
      return obj as unknown as T;
    });
  }

  // Export objects to CSV string
  static toCSV<T>(data: T[]): string {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0] as object);
    const rows = data.map((row) => headers.map((h) => String((row as Record<string, unknown>)[h] ?? "")).join(","));
    return [headers.join(","), ...rows].join("\n");
  }

  // MLC Data
  static getMlcData(): MechanicalRoyalty[] {
    return mlcData;
  }

  static addMlcRecord(record: MechanicalRoyalty): void {
    mlcData.push(record);
  }

  static importMlcCSV(csv: string): number {
    const parsed = CSVService.parseCSV<{ Writer: string; ISRC: string; Mechanical: string }>(csv);
    const records: MechanicalRoyalty[] = parsed.map((r) => ({
      writer: r.Writer,
      isrc: r.ISRC,
      mechanical: parseFloat(r.Mechanical) || 0,
      source: "MLC" as const,
    }));
    mlcData = [...mlcData, ...records];
    return records.length;
  }

  // SoundExchange Data
  static getSoundExchangeData(): SoundExchangeRecord[] {
    return soundExchangeData;
  }

  static importSoundExchangeCSV(csv: string): number {
    const parsed = CSVService.parseCSV<{
      Artist: string; ISRC: string; Mechanical: string; Plays: string; Likes: string;
    }>(csv);
    const records: SoundExchangeRecord[] = parsed.map((r) => ({
      artist: r.Artist,
      isrc: r.ISRC,
      mechanical: parseFloat(r.Mechanical) || 0,
      plays: parseInt(r.Plays) || 0,
      likes: parseInt(r.Likes) || 0,
    }));
    soundExchangeData = [...soundExchangeData, ...records];
    return records.length;
  }

  // SuperBass Stats
  static getSuperBassData(): SuperBassStats[] {
    return superBassData;
  }

  // Summary stats
  static getDashboardStats() {
    const totalMechanical = mlcData.reduce((sum, r) => sum + r.mechanical, 0);
    const totalPlays = soundExchangeData.reduce((sum, r) => sum + r.plays, 0);
    const totalSxRevenue = soundExchangeData.reduce((sum, r) => sum + r.mechanical, 0);
    const uniqueArtists = new Set([
      ...mlcData.map((r) => r.writer),
      ...soundExchangeData.map((r) => r.artist),
    ]);

    return {
      totalMechanicalRoyalties: totalMechanical,
      totalSoundExchangeRevenue: totalSxRevenue,
      totalCombinedRevenue: totalMechanical + totalSxRevenue,
      totalPlays,
      uniqueArtists: uniqueArtists.size,
      mlcRecords: mlcData.length,
      soundExchangeRecords: soundExchangeData.length,
      superBassTracks: superBassData.length,
    };
  }
}
