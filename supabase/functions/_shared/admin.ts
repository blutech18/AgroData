import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Creates a Supabase client with the service-role key, which bypasses RLS and
 * can use the Auth admin API. This must only ever be constructed inside an Edge
 * Function after the caller's own permissions have been checked: the key is a
 * secret and is never exposed to the browser.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
