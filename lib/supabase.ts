import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminClient: SupabaseClient | null | undefined;

export const RATINGS_TABLE =
  process.env.SUPABASE_RATINGS_TABLE?.trim() || "ratings";
export const USER_PROFILES_TABLE =
  process.env.SUPABASE_USER_PROFILES_TABLE?.trim() || "user_profiles";

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseAdminClient() {
  if (supabaseAdminClient !== undefined) {
    return supabaseAdminClient;
  }

  supabaseAdminClient = createSupabaseAdminClient();
  return supabaseAdminClient;
}

