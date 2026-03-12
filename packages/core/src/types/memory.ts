// Memory Architecture Types
// Source: ARCHETYPAL_AI_CIVILIZATION.md Section 25

import type { ArchetypeId } from "./archetypes.js";

// Memory tiers (Section 25)
export type MemoryTier = 1 | 2 | 3 | 4 | 5 | 6;

// Memory types
export type MemoryType = "episodic" | "semantic" | "procedural" | "emotional";

// Memory record (Section 25)
export interface MemoryRecord {
  id: string;
  content: string;
  summary?: string;
  memoryTier: MemoryTier;
  memoryType: MemoryType;
  archetypeId: ArchetypeId;
  userId: string;
  embedding?: number[];        // 1536-dim vector (when available)
  importance: number;          // 0-1
  accessCount: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Memory search filters
export interface MemorySearchFilters {
  archetypeId?: ArchetypeId;
  memoryTier?: MemoryTier;
  memoryType?: MemoryType;
  minImportance?: number;
  limit?: number;
}

// Memory stats
export interface MemoryStats {
  totalRecords: number;
  byTier: Record<number, number>;
  byType: Record<string, number>;
  byArchetype: Record<string, number>;
}
