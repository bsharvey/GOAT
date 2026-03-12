/**
 * Neural Highway Service — Inter-Archetype Communication
 *
 * Routes messages between archetypes, manages escalation to the Strategist,
 * and supports group formation for collaborative tasks.
 *
 * Source: ARCHETYPAL_AI_CIVILIZATION.md Section 28
 */

import { randomUUID } from "node:crypto";
import { ARCHETYPE_CONFIGS } from "@goat/core";
import type {
  ArchetypeId,
} from "@goat/core";
import type {
  ArchetypeMessage,
  MessageType,
  MessageStatus,
  EscalationEntry,
} from "@goat/core";

export class NeuralHighwayService {
  private messages: ArchetypeMessage[] = [];
  private escalations: EscalationEntry[] = [];

  /**
   * Send a message between archetypes
   */
  send(options: {
    fromArchetype: ArchetypeId;
    toArchetype: ArchetypeId;
    messageType: MessageType;
    content: string;
    context?: Record<string, unknown>;
    parentId?: string;
    criticality?: number;
    userId?: string;
  }): ArchetypeMessage {
    const message: ArchetypeMessage = {
      id: randomUUID(),
      userId: options.userId || "system",
      fromArchetype: options.fromArchetype,
      toArchetype: options.toArchetype,
      messageType: options.messageType,
      content: options.content,
      context: options.context || {},
      parentId: options.parentId,
      criticality: options.criticality ?? 0.5,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    this.messages.push(message);

    // Auto-escalate high-criticality messages
    if (message.criticality >= 0.8 && message.messageType !== "escalation") {
      this.escalate(message.id, "High criticality auto-escalation");
    }

    return message;
  }

  /**
   * Get inbox for an archetype
   */
  getInbox(archetypeId: ArchetypeId, status?: MessageStatus): ArchetypeMessage[] {
    return this.messages
      .filter(m =>
        m.toArchetype === archetypeId &&
        (!status || m.status === status),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Get outbox for an archetype
   */
  getOutbox(archetypeId: ArchetypeId): ArchetypeMessage[] {
    return this.messages
      .filter(m => m.fromArchetype === archetypeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Mark a message as read/responded
   */
  updateStatus(messageId: string, status: MessageStatus): void {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.status = status;
    }
  }

  /**
   * Reply to a message (creates a threaded response)
   */
  reply(
    messageId: string,
    fromArchetype: ArchetypeId,
    content: string,
  ): ArchetypeMessage | undefined {
    const original = this.messages.find(m => m.id === messageId);
    if (!original) return undefined;

    // Mark original as responded
    original.status = "responded";

    // Send reply
    return this.send({
      fromArchetype,
      toArchetype: original.fromArchetype,
      messageType: "response",
      content,
      context: { replyTo: messageId },
      parentId: messageId,
      criticality: original.criticality,
      userId: original.userId,
    });
  }

  /**
   * Escalate a message to the Strategist
   */
  escalate(messageId: string, reason: string): EscalationEntry {
    const message = this.messages.find(m => m.id === messageId);
    if (!message) throw new Error(`Message ${messageId} not found`);

    message.status = "escalated";

    const escalation: EscalationEntry = {
      id: randomUUID(),
      messageId,
      fromArchetype: message.fromArchetype,
      reason,
      criticality: message.criticality,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    this.escalations.push(escalation);

    // Create an escalation message to the Strategist
    this.send({
      fromArchetype: message.fromArchetype,
      toArchetype: "strategist",
      messageType: "escalation",
      content: `ESCALATION from ${ARCHETYPE_CONFIGS[message.fromArchetype].displayName}: ${reason}\n\nOriginal message: ${message.content}`,
      context: { escalationId: escalation.id, originalMessageId: messageId },
      criticality: Math.min(1, message.criticality + 0.1),
      userId: message.userId,
    });

    return escalation;
  }

  /**
   * Resolve an escalation
   */
  resolveEscalation(
    escalationId: string,
    approved: boolean,
  ): void {
    const escalation = this.escalations.find(e => e.id === escalationId);
    if (escalation) {
      escalation.status = approved ? "approved" : "denied";
    }
  }

  /**
   * Get pending escalations
   */
  getPendingEscalations(): EscalationEntry[] {
    return this.escalations.filter(e => e.status === "pending");
  }

  /**
   * Broadcast a message to multiple archetypes
   */
  broadcast(
    fromArchetype: ArchetypeId,
    toArchetypes: ArchetypeId[],
    messageType: MessageType,
    content: string,
    context?: Record<string, unknown>,
  ): ArchetypeMessage[] {
    return toArchetypes.map(toArchetype =>
      this.send({
        fromArchetype,
        toArchetype,
        messageType,
        content,
        context,
      }),
    );
  }

  /**
   * Get a message thread
   */
  getThread(messageId: string): ArchetypeMessage[] {
    const thread: ArchetypeMessage[] = [];
    const root = this.messages.find(m => m.id === messageId);
    if (!root) return [];

    thread.push(root);

    // Find all replies in the thread
    const replies = this.messages.filter(m => m.parentId === messageId);
    thread.push(...replies);

    // Recursively find nested replies
    for (const reply of replies) {
      const nested = this.getThread(reply.id);
      thread.push(...nested.filter(m => !thread.some(t => t.id === m.id)));
    }

    return thread.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Stats
   */
  stats() {
    return {
      totalMessages: this.messages.length,
      pendingMessages: this.messages.filter(m => m.status === "pending").length,
      totalEscalations: this.escalations.length,
      pendingEscalations: this.escalations.filter(e => e.status === "pending").length,
      byType: this.messages.reduce((acc, m) => {
        acc[m.messageType] = (acc[m.messageType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

// Singleton
export const neuralHighwayService = new NeuralHighwayService();
