import { getSupabase } from "../db.js";

export interface PaymentRow {
  id: string;
  artist_id: string;
  total_amount: number;
  currency: string;
  payment_date: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded";
  method: "bank_transfer" | "paypal" | "stripe" | "check" | "cash" | "other";
  transaction_id: string | null;
  reference_number: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_routing: string | null;
  bank_swift: string | null;
  bank_iban: string | null;
  processing_fees: number;
  taxes: number;
  net_amount: number;
  notes: string | null;
  created_by: string | null;
  processed_by: string | null;
  processed_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  refund_amount: number | null;
  refund_date: string | null;
  refund_reason: string | null;
  refund_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `PAY-${timestamp}-${random}`.toUpperCase();
}

export const PaymentModel = {
  async create(data: {
    artist_id: string;
    total_amount: number;
    method: string;
    created_by: string;
    royalty_ids?: Array<{ royalty_id: string; amount: number }>;
    notes?: string;
    processing_fees?: number;
    taxes?: number;
  }) {
    const fees = data.processing_fees || 0;
    const taxes = data.taxes || 0;
    const net_amount = data.total_amount - fees - taxes;

    const { data: payment, error } = await getSupabase()
      .from("payments")
      .insert({
        artist_id: data.artist_id,
        total_amount: data.total_amount,
        method: data.method,
        created_by: data.created_by,
        net_amount,
        processing_fees: fees,
        taxes,
        notes: data.notes,
        transaction_id: generateTransactionId(),
      })
      .select()
      .single();

    if (error) throw error;

    // Link royalties to this payment
    if (data.royalty_ids && data.royalty_ids.length > 0) {
      const links = data.royalty_ids.map((r) => ({
        payment_id: payment.id,
        royalty_id: r.royalty_id,
        amount: r.amount,
      }));
      await getSupabase().from("payment_royalties").insert(links);
    }

    return payment as PaymentRow;
  },

  async findById(id: string) {
    const { data, error } = await getSupabase()
      .from("payments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as PaymentRow;
  },

  async list(options: {
    artist_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    let query = getSupabase().from("payments").select("*", { count: "exact" });

    if (options.artist_id) query = query.eq("artist_id", options.artist_id);
    if (options.status) query = query.eq("status", options.status);
    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);

    query = query.order("payment_date", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data as PaymentRow[], count: count || 0 };
  },

  async process(id: string, processedBy: string) {
    const { data, error } = await getSupabase()
      .from("payments")
      .update({
        status: "processing",
        processed_by: processedBy,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as PaymentRow;
  },

  async complete(id: string) {
    // Get payment with linked royalties
    const payment = await this.findById(id);
    const { data: links } = await getSupabase()
      .from("payment_royalties")
      .select("royalty_id, amount")
      .eq("payment_id", id);

    // Update each linked royalty's paid_amount
    if (links) {
      for (const link of links) {
        await getSupabase().rpc("increment_royalty_paid", {
          royalty_uuid: link.royalty_id,
          pay_amount: link.amount,
        });
      }
    }

    const { data, error } = await getSupabase()
      .from("payments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as PaymentRow;
  },

  async fail(id: string, reason: string) {
    const { data, error } = await getSupabase()
      .from("payments")
      .update({
        status: "failed",
        failure_reason: reason,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as PaymentRow;
  },

  async getPaymentSummary(artistId: string) {
    const { data, error } = await getSupabase()
      .from("payments")
      .select("total_amount, net_amount, processing_fees, taxes, status")
      .eq("artist_id", artistId);

    if (error) throw error;
    const rows = data || [];

    return {
      totalPayments: rows.reduce((s: number, r: { total_amount: number }) => s + r.total_amount, 0),
      completedPayments: rows
        .filter((r: { status: string }) => r.status === "completed")
        .reduce((s: number, r: { total_amount: number }) => s + r.total_amount, 0),
      pendingPayments: rows
        .filter((r: { status: string }) => r.status === "pending")
        .reduce((s: number, r: { total_amount: number }) => s + r.total_amount, 0),
      totalFees: rows.reduce((s: number, r: { processing_fees: number }) => s + r.processing_fees, 0),
      totalTaxes: rows.reduce((s: number, r: { taxes: number }) => s + r.taxes, 0),
      netAmount: rows.reduce((s: number, r: { net_amount: number }) => s + r.net_amount, 0),
      paymentCount: rows.length,
      completedCount: rows.filter((r: { status: string }) => r.status === "completed").length,
    };
  },
};
