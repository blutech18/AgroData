import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Creates a Supabase client scoped to the calling user's JWT so that Row Level
 * Security policies apply exactly as they do from the browser. The Authorization
 * header is forwarded from the incoming request.
 */
export function createUserClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

/** Thrown when the caller is not allowed to run the requested operation. */
export class AuthorizationError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

/**
 * Requires the caller to be a signed-in user with an ACTIVE profile whose role
 * is Municipal Agriculturalist. RLS alone cannot express this, because encoders
 * legitimately read the same underlying rows; report generation and statistics
 * recomputation are oversight actions, so they are checked here rather than
 * relying on the router guard in the browser.
 */
export async function requireAdmin(supabase: SupabaseClient): Promise<void> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) {
    throw new AuthorizationError("Sign in to perform this action.", 401);
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("account_status, user_roles(role_name)")
    .eq("auth_id", auth.user.id)
    .maybeSingle();

  if (error) throw error;

  const roleName = (profile as { user_roles?: { role_name?: string } } | null)?.user_roles
    ?.role_name;
  const isActive =
    (profile as { account_status?: string } | null)?.account_status === "ACTIVE";

  if (!profile || !isActive || roleName !== "Municipal Agriculturalist") {
    throw new AuthorizationError(
      "Only the Municipal Agriculturalist may perform this action."
    );
  }
}
