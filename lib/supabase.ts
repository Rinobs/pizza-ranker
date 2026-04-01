import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminClient: SupabaseClient | null | undefined;

export const RATINGS_TABLE =
  process.env.SUPABASE_RATINGS_TABLE?.trim() || "ratings";
export const USER_PROFILES_TABLE =
  process.env.SUPABASE_USER_PROFILES_TABLE?.trim() || "user_profiles";
export const USER_PRODUCT_LISTS_TABLE =
  process.env.SUPABASE_USER_PRODUCT_LISTS_TABLE?.trim() || "user_product_lists";
export const USER_FOLLOWS_TABLE =
  process.env.SUPABASE_USER_FOLLOWS_TABLE?.trim() || "user_follows";
export const USER_CUSTOM_LISTS_TABLE =
  process.env.SUPABASE_USER_CUSTOM_LISTS_TABLE?.trim() || "user_custom_lists";
export const USER_CUSTOM_LIST_ITEMS_TABLE =
  process.env.SUPABASE_USER_CUSTOM_LIST_ITEMS_TABLE?.trim() ||
  "user_custom_list_items";
export const REVIEW_LIKES_TABLE =
  process.env.SUPABASE_REVIEW_LIKES_TABLE?.trim() || "review_likes";
export const REVIEW_REPLIES_TABLE =
  process.env.SUPABASE_REVIEW_REPLIES_TABLE?.trim() || "review_replies";
export const PRODUCT_SUBMISSIONS_TABLE =
  process.env.SUPABASE_PRODUCT_SUBMISSIONS_TABLE?.trim() || "product_submissions";

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


