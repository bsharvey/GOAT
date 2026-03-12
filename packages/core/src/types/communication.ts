// Inter-Archetype Communication Types
// Source: ARCHETYPAL_AI_CIVILIZATION.md Section 28

import type { ArchetypeId } from "./archetypes.js";

// Message types (Section 28)
export type MessageType =
  | "direct"
  | "escalation"
  | "response"
  | "signal"
  | "request"
  | "collaboration_request"
  | "delegation"
  | "status_update"
  | "group_formation"
  | "insight_share"
  | "alert";

// Message status
export type MessageStatus = "pending" | "read" | "responded" | "escalated";

// Archetype message (Section 28)
export interface ArchetypeMessage {
  id: string;
  userId: string;
  fromArchetype: ArchetypeId;
  toArchetype: ArchetypeId;
  messageType: MessageType;
  content: string;
  context: Record<string, unknown>;
  parentId?: string;           // Thread support
  criticality: number;         // 0-1
  status: MessageStatus;
  createdAt: string;
}

// Escalation queue entry
export interface EscalationEntry {
  id: string;
  messageId: string;
  fromArchetype: ArchetypeId;
  reason: string;
  criticality: number;
  status: "pending" | "approved" | "denied";
  createdAt: string;
}
