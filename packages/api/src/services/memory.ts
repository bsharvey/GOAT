/**
 * Memory Architecture Service — 4-Tier Memory System
 *
 * In-memory implementation with TF-IDF keyword search.
 * Structured for future migration to vector search (pgvector).
 *
 * Source: ARCHETYPAL_AI_CIVILIZATION.md Section 25
 */

import { randomUUID } from "node:crypto";
import type {
  ArchetypeId,
} from "@goat/core";
import type {
  MemoryRecord,
  MemoryTier,
  MemoryType,
  MemorySearchFilters,
  MemoryStats,
} from "@goat/core";

export class MemoryService {
  private records: MemoryRecord[] = [];

  /**
   * Inscribe a new memory
   */
  inscribe(options: {
    content: string;
    summary?: string;
    memoryTier: MemoryTier;
    memoryType: MemoryType;
    archetypeId: ArchetypeId;
    userId?: string;
    importance?: number;
    expiresAt?: string;
  }): MemoryRecord {
    const now = new Date().toISOString();

    const record: MemoryRecord = {
      id: randomUUID(),
      content: options.content,
      summary: options.summary,
      memoryTier: options.memoryTier,
      memoryType: options.memoryType,
      archetypeId: options.archetypeId,
      userId: options.userId || "system",
      importance: options.importance ?? 0.5,
      accessCount: 0,
      expiresAt: options.expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    this.records.push(record);
    return record;
  }

  /**
   * Recall memories by keyword search (TF-IDF style)
   */
  recall(
    query: string,
    filters?: MemorySearchFilters,
  ): MemoryRecord[] {
    const lower = query.toLowerCase();
    const queryWords = lower.split(/\s+/).filter(w => w.length > 2);
    const now = new Date();

    let candidates = this.records.filter(r => {
      // Filter out expired
      if (r.expiresAt && new Date(r.expiresAt) < now) return false;

      // Apply filters
      if (filters?.archetypeId && r.archetypeId !== filters.archetypeId) return false;
      if (filters?.memoryTier && r.memoryTier !== filters.memoryTier) return false;
      if (filters?.memoryType && r.memoryType !== filters.memoryType) return false;
      if (filters?.minImportance && r.importance < filters.minImportance) return false;

      return true;
    });

    // Score by keyword relevance
    const scored = candidates.map(record => {
      const text = `${record.content} ${record.summary || ""}`.toLowerCase();
      const wordCount = text.split(/\s+/).length;

      // TF-IDF inspired scoring
      let score = 0;
      for (const word of queryWords) {
        const termFreq = (text.match(new RegExp(word, "g")) || []).length / wordCount;
        const docFreq = this.records.filter(r =>
          `${r.content} ${r.summary || ""}`.toLowerCase().includes(word),
        ).length;
        const idf = Math.log(this.records.length / Math.max(1, docFreq));
        score += termFreq * idf;
      }

      // Weight by importance and recency
      const ageHours = (now.getTime() - new Date(record.createdAt).getTime()) / (1000 * 60 * 60);
      const recencyBoost = 1 / (1 + ageHours / 168); // Decay over ~1 week
      score = score * (0.5 + record.importance * 0.5) * (0.7 + recencyBoost * 0.3);

      return { record, score };
    });

    // Sort by score, return top results
    const limit = filters?.limit || 10;
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => {
        // Increment access count
        s.record.accessCount++;
        s.record.updatedAt = now.toISOString();
        return s.record;
      });
  }

  /**
   * Get recent memories for an archetype
   */
  getRecent(archetypeId: ArchetypeId, limit = 10): MemoryRecord[] {
    return this.records
      .filter(r => r.archetypeId === archetypeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  /**
   * Get a specific memory by ID
   */
  get(id: string): MemoryRecord | undefined {
    return this.records.find(r => r.id === id);
  }

  /**
   * Update importance of a memory
   */
  updateImportance(id: string, importance: number): void {
    const record = this.records.find(r => r.id === id);
    if (record) {
      record.importance = Math.max(0, Math.min(1, importance));
      record.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Remove expired memories (garbage collection)
   */
  gc(): number {
    const now = new Date();
    const before = this.records.length;
    this.records = this.records.filter(r =>
      !r.expiresAt || new Date(r.expiresAt) >= now,
    );
    return before - this.records.length;
  }

  /**
   * Stats
   */
  stats(): MemoryStats {
    const byTier: Record<number, number> = {};
    const byType: Record<string, number> = {};
    const byArchetype: Record<string, number> = {};

    for (const record of this.records) {
      byTier[record.memoryTier] = (byTier[record.memoryTier] || 0) + 1;
      byType[record.memoryType] = (byType[record.memoryType] || 0) + 1;
      byArchetype[record.archetypeId] = (byArchetype[record.archetypeId] || 0) + 1;
    }

    return {
      totalRecords: this.records.length,
      byTier,
      byType,
      byArchetype,
    };
  }
}

// Singleton
export const memoryService = new MemoryService();
