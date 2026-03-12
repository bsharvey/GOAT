import { getSupabase } from "../db.js";

export interface ContractRow {
  id: string;
  title: string;
  contract_number: string;
  type: "recording" | "publishing" | "distribution" | "licensing" | "management" | "other";
  status: "draft" | "pending" | "active" | "expired" | "terminated" | "suspended";
  start_date: string;
  end_date: string | null;
  duration_months: number;
  exclusivity: boolean;
  territory: string[];
  auto_renew: boolean;
  renewal_period: string | null;
  renewal_notice_days: number;
  payment_frequency: string;
  payment_days: number;
  reporting_period: string;
  currency: string;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  terminated_at: string | null;
  terminated_by: string | null;
  termination_reason: string | null;
  created_at: string;
  updated_at: string;
}

function generateContractNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CON-${year}-${random}`;
}

export const ContractModel = {
  async create(data: {
    title: string;
    type: string;
    start_date: string;
    duration_months: number;
    created_by: string;
    artist_ids: string[];
    exclusivity?: boolean;
    territory?: string[];
    payment_frequency?: string;
    notes?: string;
    royalties?: Array<{
      type: string;
      rate: number;
      rate_type?: string;
      basis?: string;
      min_guarantee?: number;
      recoupable?: boolean;
    }>;
    advances?: Array<{
      amount: number;
      description?: string;
      recoupable?: boolean;
    }>;
  }) {
    const { data: contract, error } = await getSupabase()
      .from("contracts")
      .insert({
        title: data.title,
        contract_number: generateContractNumber(),
        type: data.type,
        start_date: data.start_date,
        duration_months: data.duration_months,
        created_by: data.created_by,
        exclusivity: data.exclusivity || false,
        territory: data.territory || [],
        payment_frequency: data.payment_frequency || "quarterly",
        notes: data.notes,
      })
      .select()
      .single();

    if (error) throw error;

    // Link artists
    if (data.artist_ids.length > 0) {
      const links = data.artist_ids.map((aid) => ({
        contract_id: contract.id,
        artist_id: aid,
      }));
      await getSupabase().from("contract_artists").insert(links);
    }

    // Insert royalty rates
    if (data.royalties && data.royalties.length > 0) {
      const rates = data.royalties.map((r) => ({
        contract_id: contract.id,
        type: r.type,
        rate: r.rate,
        rate_type: r.rate_type || "percentage",
        basis: r.basis || "net",
        min_guarantee: r.min_guarantee || 0,
        recoupable: r.recoupable ?? true,
      }));
      await getSupabase().from("contract_royalties").insert(rates);
    }

    // Insert advances
    if (data.advances && data.advances.length > 0) {
      const advs = data.advances.map((a) => ({
        contract_id: contract.id,
        amount: a.amount,
        description: a.description,
        recoupable: a.recoupable ?? true,
      }));
      await getSupabase().from("contract_advances").insert(advs);
    }

    return contract as ContractRow;
  },

  async findById(id: string) {
    const { data, error } = await getSupabase()
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    // Get linked artists, royalties, advances
    const [artists, royalties, advances] = await Promise.all([
      getSupabase().from("contract_artists").select("artist_id").eq("contract_id", id),
      getSupabase().from("contract_royalties").select("*").eq("contract_id", id),
      getSupabase().from("contract_advances").select("*").eq("contract_id", id),
    ]);

    return {
      ...data,
      artist_ids: (artists.data || []).map((a: { artist_id: string }) => a.artist_id),
      royalties: royalties.data || [],
      advances: advances.data || [],
    } as ContractRow & { artist_ids: string[]; royalties: unknown[]; advances: unknown[] };
  },

  async list(options: {
    status?: string;
    type?: string;
    artist_id?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    let query = getSupabase().from("contracts").select("*", { count: "exact" });

    if (options.status) query = query.eq("status", options.status);
    if (options.type) query = query.eq("type", options.type);
    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);

    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    // If filtering by artist, filter client-side via junction table
    if (options.artist_id) {
      const { data: links } = await getSupabase()
        .from("contract_artists")
        .select("contract_id")
        .eq("artist_id", options.artist_id);

      const contractIds = new Set((links || []).map((l: { contract_id: string }) => l.contract_id));
      const filtered = (data || []).filter((c: ContractRow) => contractIds.has(c.id));
      return { data: filtered as ContractRow[], count: filtered.length };
    }

    return { data: data as ContractRow[], count: count || 0 };
  },

  async activate(id: string, approvedBy: string) {
    const contract = await this.findById(id);
    const endDate = new Date(contract.start_date);
    endDate.setMonth(endDate.getMonth() + contract.duration_months);

    const { data, error } = await getSupabase()
      .from("contracts")
      .update({
        status: "active",
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        end_date: endDate.toISOString().split("T")[0],
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ContractRow;
  },

  async terminate(id: string, terminatedBy: string, reason: string) {
    const { data, error } = await getSupabase()
      .from("contracts")
      .update({
        status: "terminated",
        terminated_by: terminatedBy,
        terminated_at: new Date().toISOString(),
        termination_reason: reason,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ContractRow;
  },

  async getExpiring(days = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const { data, error } = await getSupabase()
      .from("contracts")
      .select("*")
      .eq("status", "active")
      .lte("end_date", expiryDate.toISOString().split("T")[0])
      .gt("end_date", new Date().toISOString().split("T")[0]);

    if (error) throw error;
    return data as ContractRow[];
  },
};
