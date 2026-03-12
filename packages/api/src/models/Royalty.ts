import { getSupabase } from "../db.js";

export interface RoyaltyRow {
  id: string;
  artist_id: string;
  contract_id: string | null;
  work_title: string;
  work_type: "song" | "album" | "video" | "book" | "software" | "other";
  period_start: string;
  period_end: string;
  currency: string;
  amount: number;
  pending_amount: number;
  paid_amount: number;
  royalty_rate: number;
  units_sold: number;
  total_revenue: number;
  streams: number;
  downloads: number;
  source: "spotify" | "apple" | "youtube" | "amazon" | "physical" | "digital" | "other";
  source_platform: string | null;
  source_region: string | null;
  source_report_id: string | null;
  source_import_date: string | null;
  status: "pending" | "approved" | "paid" | "disputed" | "cancelled";
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export const RoyaltyModel = {
  async create(data: Partial<RoyaltyRow>) {
    const { data: royalty, error } = await getSupabase()
      .from("royalties")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return royalty as RoyaltyRow;
  },

  async findById(id: string) {
    const { data, error } = await getSupabase()
      .from("royalties")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as RoyaltyRow;
  },

  async list(options: {
    artist_id?: string;
    status?: string;
    source?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    let query = getSupabase().from("royalties").select("*", { count: "exact" });

    if (options.artist_id) query = query.eq("artist_id", options.artist_id);
    if (options.status) query = query.eq("status", options.status);
    if (options.source) query = query.eq("source", options.source);
    if (options.start_date) query = query.gte("period_start", options.start_date);
    if (options.end_date) query = query.lte("period_end", options.end_date);
    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);

    query = query.order("period_start", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data as RoyaltyRow[], count: count || 0 };
  },

  async update(id: string, updates: Partial<RoyaltyRow>) {
    const { data, error } = await getSupabase()
      .from("royalties")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as RoyaltyRow;
  },

  async approve(id: string, approvedBy: string) {
    return this.update(id, {
      status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    });
  },

  async getStats() {
    const { data, error } = await getSupabase()
      .from("royalties")
      .select("amount, pending_amount, paid_amount, source, status, streams");

    if (error) throw error;
    const rows = data || [];

    return {
      totalRevenue: rows.reduce((s: number, r: { amount: number }) => s + r.amount, 0),
      pendingAmount: rows.reduce((s: number, r: { pending_amount: number }) => s + r.pending_amount, 0),
      paidAmount: rows.reduce((s: number, r: { paid_amount: number }) => s + r.paid_amount, 0),
      totalStreams: rows.reduce((s: number, r: { streams: number }) => s + (r.streams || 0), 0),
      totalRecords: rows.length,
      bySource: rows.reduce((acc: Record<string, number>, r: { source: string; amount: number }) => {
        acc[r.source] = (acc[r.source] || 0) + r.amount;
        return acc;
      }, {}),
      byStatus: rows.reduce((acc: Record<string, number>, r: { status: string }) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {}),
    };
  },

  async getArtistSummary(artistId: string, startDate?: string, endDate?: string) {
    let query = getSupabase()
      .from("royalties")
      .select("amount, pending_amount, paid_amount, units_sold, streams, downloads")
      .eq("artist_id", artistId);

    if (startDate) query = query.gte("period_start", startDate);
    if (endDate) query = query.lte("period_start", endDate);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    return {
      totalRoyalties: rows.reduce((s: number, r: { amount: number }) => s + r.amount, 0),
      paidAmount: rows.reduce((s: number, r: { paid_amount: number }) => s + r.paid_amount, 0),
      pendingAmount: rows.reduce((s: number, r: { pending_amount: number }) => s + r.pending_amount, 0),
      totalUnits: rows.reduce((s: number, r: { units_sold: number }) => s + (r.units_sold || 0), 0),
      totalStreams: rows.reduce((s: number, r: { streams: number }) => s + (r.streams || 0), 0),
      totalDownloads: rows.reduce((s: number, r: { downloads: number }) => s + (r.downloads || 0), 0),
      count: rows.length,
    };
  },

  async getRevenueBySource() {
    const { data, error } = await getSupabase()
      .from("royalties")
      .select("source, amount");

    if (error) throw error;
    const rows = data || [];

    const bySource: Record<string, number> = {};
    for (const r of rows) {
      bySource[r.source] = (bySource[r.source] || 0) + r.amount;
    }
    return Object.entries(bySource).map(([source, amount]) => ({ source, amount }));
  },

  async getRevenueByPeriod(months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data, error } = await getSupabase()
      .from("royalties")
      .select("period_start, amount")
      .gte("period_start", startDate.toISOString().split("T")[0])
      .order("period_start", { ascending: true });

    if (error) throw error;
    const rows = data || [];

    const byMonth: Record<string, number> = {};
    for (const r of rows) {
      const month = r.period_start.substring(0, 7); // YYYY-MM
      byMonth[month] = (byMonth[month] || 0) + r.amount;
    }
    return Object.entries(byMonth).map(([month, amount]) => ({ month, amount }));
  },
};
