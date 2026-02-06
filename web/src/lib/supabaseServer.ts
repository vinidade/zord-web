import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function getSupabaseServer() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase server env vars are missing.");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}
