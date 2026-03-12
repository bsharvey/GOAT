import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("Supabase credentials not configured — add SUPABASE_URL and SUPABASE_ANON_KEY to .env");
    // Return a dummy client that will fail gracefully
    throw new Error("Supabase not configured");
  }

  supabase = createClient(url, key);
  return supabase;
}

export async function connectDB(): Promise<void> {
  try {
    const client = getSupabase();
    // Test the connection
    const { error } = await client.from("users").select("id").limit(1);
    if (error && !error.message.includes("does not exist")) {
      console.warn("Supabase connection test warning:", error.message);
    }
    console.log("Supabase connected");
  } catch (err) {
    console.warn("Supabase not configured — add credentials to .env to enable database features");
  }
}
