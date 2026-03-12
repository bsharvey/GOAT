import { getSupabase } from "../db.js";

export interface ArtistRow {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatar: string | null;
  social_website: string | null;
  social_spotify: string | null;
  social_apple_music: string | null;
  social_youtube: string | null;
  social_instagram: string | null;
  social_twitter: string | null;
  social_facebook: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  address_country: string | null;
  tax_id: string | null;
  tax_id_type: string | null;
  tax_id_country: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_routing: string | null;
  bank_swift: string | null;
  bank_iban: string | null;
  tags: string[];
  genre: string[];
  total_earnings: number;
  pending_earnings: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const ArtistModel = {
  async create(data: {
    user_id: string;
    name: string;
    email?: string;
    phone?: string;
    bio?: string;
    genre?: string[];
    tags?: string[];
  }) {
    const { data: artist, error } = await getSupabase()
      .from("artists")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return artist as ArtistRow;
  },

  async findById(id: string) {
    const { data, error } = await getSupabase()
      .from("artists")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as ArtistRow;
  },

  async findByUserId(userId: string) {
    const { data, error } = await getSupabase()
      .from("artists")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as ArtistRow[];
  },

  async list(options: { limit?: number; offset?: number; active?: boolean; search?: string } = {}) {
    let query = getSupabase().from("artists").select("*", { count: "exact" });

    if (options.active !== undefined) query = query.eq("is_active", options.active);
    if (options.search) query = query.ilike("name", `%${options.search}%`);
    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);

    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data as ArtistRow[], count: count || 0 };
  },

  async update(id: string, updates: Partial<Omit<ArtistRow, "id" | "created_at">>) {
    const { data, error } = await getSupabase()
      .from("artists")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ArtistRow;
  },

  async delete(id: string) {
    const { error } = await getSupabase().from("artists").delete().eq("id", id);
    if (error) throw error;
  },

  async getEarningsSummary(artistId: string) {
    const { data, error } = await getSupabase()
      .from("royalties")
      .select("amount, pending_amount, paid_amount, source, streams, downloads")
      .eq("artist_id", artistId);

    if (error) throw error;

    const rows = data || [];
    return {
      totalRoyalties: rows.reduce((sum: number, r: { amount: number }) => sum + r.amount, 0),
      paidAmount: rows.reduce((sum: number, r: { paid_amount: number }) => sum + r.paid_amount, 0),
      pendingAmount: rows.reduce((sum: number, r: { pending_amount: number }) => sum + r.pending_amount, 0),
      totalStreams: rows.reduce((sum: number, r: { streams: number }) => sum + (r.streams || 0), 0),
      totalDownloads: rows.reduce((sum: number, r: { downloads: number }) => sum + (r.downloads || 0), 0),
      count: rows.length,
    };
  },
};
