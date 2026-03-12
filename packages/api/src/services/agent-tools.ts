/**
 * Agent Tool Registry — Typed tool definitions + executors
 *
 * Each tool wraps a Supabase model operation so the autonomous agent
 * can call them via function-calling. Civilization middleware wraps the
 * agent itself — individual tools are pure data operations.
 */

import { RoyaltyModel } from "../models/Royalty.js";
import { PaymentModel } from "../models/Payment.js";
import { ArtistModel } from "../models/Artist.js";
import { ContractModel } from "../models/Contract.js";
import { ragService } from "./rag.js";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

// ── Tool executors ──────────────────────────────────────────

async function analyzeRoyalties(params: Record<string, unknown>) {
  const artistId = params.artistId as string | undefined;
  const startDate = params.startDate as string | undefined;
  const endDate = params.endDate as string | undefined;

  if (artistId) {
    const summary = await RoyaltyModel.getArtistSummary(artistId, startDate, endDate);
    return { type: "artist_summary", data: summary };
  }

  const stats = await RoyaltyModel.getStats();
  return { type: "overall_stats", data: stats };
}

async function processPayment(params: Record<string, unknown>) {
  const artistId = params.artistId as string;
  const amount = params.amount as number;
  const method = params.method as string;
  const payment = await PaymentModel.create({
    artist_id: artistId,
    total_amount: amount,
    method,
    created_by: "agent-system",
  });
  return { type: "payment_created", data: payment };
}

async function generateReport(params: Record<string, unknown>) {
  const reportType = params.reportType as string;

  switch (reportType) {
    case "revenue_by_source": {
      const data = await RoyaltyModel.getRevenueBySource();
      return { type: "revenue_by_source", data };
    }
    case "revenue_by_period": {
      const months = (params.months as number) || 12;
      const data = await RoyaltyModel.getRevenueByPeriod(months);
      return { type: "revenue_by_period", data };
    }
    case "stats": {
      const data = await RoyaltyModel.getStats();
      return { type: "stats", data };
    }
    default:
      return { type: "error", message: `Unknown report type: ${reportType}` };
  }
}

async function manageArtist(params: Record<string, unknown>) {
  const action = params.action as string;
  const artistId = params.artistId as string | undefined;

  switch (action) {
    case "list": {
      const result = await ArtistModel.list({
        search: params.search as string | undefined,
        limit: (params.limit as number) || 20,
        offset: 0,
      });
      return { type: "artist_list", data: result };
    }
    case "get": {
      if (!artistId) return { type: "error", message: "artistId required" };
      const artist = await ArtistModel.findById(artistId);
      return { type: "artist_detail", data: artist };
    }
    case "earnings": {
      if (!artistId) return { type: "error", message: "artistId required" };
      const earnings = await ArtistModel.getEarningsSummary(artistId);
      return { type: "artist_earnings", data: earnings };
    }
    default:
      return { type: "error", message: `Unknown action: ${action}` };
  }
}

async function contractAnalysis(params: Record<string, unknown>) {
  const contractId = params.contractId as string | undefined;

  if (contractId) {
    const contract = await ContractModel.findById(contractId);
    return { type: "contract_detail", data: contract };
  }

  const days = (params.expiringDays as number) || 30;
  const expiring = await ContractModel.getExpiring(days);
  return { type: "expiring_contracts", data: expiring };
}

async function revenueForecast(params: Record<string, unknown>) {
  const artistId = params.artistId as string | undefined;
  const months = (params.months as number) || 6;

  // Get historical data for the artist or overall
  const historical = await RoyaltyModel.getRevenueByPeriod(12);

  // Simple trend-based projection (AI will interpret this)
  return {
    type: "revenue_forecast",
    data: {
      artistId: artistId || "all",
      historical,
      projectionMonths: months,
      note: "Use historical data to extrapolate trends. Consider seasonality and growth rates.",
    },
  };
}

async function searchKnowledge(params: Record<string, unknown>) {
  const query = params.query as string;
  const context = ragService.buildContext(query);
  return { type: "knowledge_search", data: { query, context } };
}

async function paymentSummary(params: Record<string, unknown>) {
  const artistId = params.artistId as string;
  const summary = await PaymentModel.getPaymentSummary(artistId);
  return { type: "payment_summary", data: summary };
}

// ── Tool registry ──────────────────────────────────────────

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "analyze_royalties",
    description: "Analyze royalty data — summaries, stats, trends. Optionally filter by artist and date range.",
    parameters: {
      type: "object",
      properties: {
        artistId: { type: "string", description: "Artist ID (optional — omit for overall stats)" },
        startDate: { type: "string", description: "Start date ISO (optional)" },
        endDate: { type: "string", description: "End date ISO (optional)" },
      },
    },
    execute: analyzeRoyalties,
  },
  {
    name: "process_payment",
    description: "Create a new payment record for an artist.",
    parameters: {
      type: "object",
      properties: {
        artistId: { type: "string", description: "Artist ID" },
        amount: { type: "number", description: "Payment amount in USD" },
        method: { type: "string", enum: ["bank_transfer", "paypal", "stripe", "check"] },
        royaltyIds: { type: "array", items: { type: "string" }, description: "Royalty IDs to link" },
      },
      required: ["artistId", "amount", "method"],
    },
    execute: processPayment,
  },
  {
    name: "generate_report",
    description: "Generate analytics reports: revenue_by_source, revenue_by_period, stats.",
    parameters: {
      type: "object",
      properties: {
        reportType: { type: "string", enum: ["revenue_by_source", "revenue_by_period", "stats"] },
        months: { type: "number", description: "For revenue_by_period: how many months" },
      },
      required: ["reportType"],
    },
    execute: generateReport,
  },
  {
    name: "manage_artist",
    description: "List, get, or view earnings for artists.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list", "get", "earnings"] },
        artistId: { type: "string", description: "Required for get/earnings" },
        search: { type: "string", description: "Search query for list action" },
        limit: { type: "number", description: "Max results for list" },
      },
      required: ["action"],
    },
    execute: manageArtist,
  },
  {
    name: "contract_analysis",
    description: "Get contract details or list expiring contracts.",
    parameters: {
      type: "object",
      properties: {
        contractId: { type: "string", description: "Contract ID for detail view" },
        expiringDays: { type: "number", description: "Days threshold for expiring contracts (default 30)" },
      },
    },
    execute: contractAnalysis,
  },
  {
    name: "revenue_forecast",
    description: "Get historical revenue data for trend-based forecasting.",
    parameters: {
      type: "object",
      properties: {
        artistId: { type: "string", description: "Artist ID (optional — omit for overall)" },
        months: { type: "number", description: "Months to project forward (default 6)" },
      },
    },
    execute: revenueForecast,
  },
  {
    name: "search_knowledge",
    description: "Search the RAG knowledge base for royalty, music industry, or platform info.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
    execute: searchKnowledge,
  },
  {
    name: "payment_summary",
    description: "Get payment history and summary for a specific artist.",
    parameters: {
      type: "object",
      properties: {
        artistId: { type: "string", description: "Artist ID" },
      },
      required: ["artistId"],
    },
    execute: paymentSummary,
  },
];

/** Look up a tool by name */
export function getTool(name: string): ToolDefinition | undefined {
  return AGENT_TOOLS.find((t) => t.name === name);
}

/** Get OpenAI-compatible function definitions for the LLM */
export function getToolDefinitions() {
  return AGENT_TOOLS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}
