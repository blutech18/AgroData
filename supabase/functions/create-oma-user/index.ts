// AGRODATA - create-oma-user Edge Function
//
// Provisions an OMA login account and its linked public.users profile in one
// server-side operation. This replaces client-side signUp, which had three
// problems: the account was left unconfirmed when email confirmation is on, the
// administrator had to set someone else's password, and a failure part-way
// through left an auth account with no profile (or vice versa).
//
// Only the Municipal Agriculturalist may call this.
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { AuthorizationError, createUserClient, requireAdmin } from "../_shared/client.ts";
import { createAdminClient } from "../_shared/admin.ts";

interface CreateUserBody {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role_id: number;
  /** Optional. When omitted, the user receives an invite email and sets their own password. */
  password?: string;
}

function validate(body: CreateUserBody): string | null {
  if (!body.email?.trim()) return "Email is required.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email.trim())) return "Enter a valid email address.";
  if (!body.username?.trim()) return "Username is required.";
  if (!body.first_name?.trim()) return "First name is required.";
  if (!body.last_name?.trim()) return "Last name is required.";
  if (!body.role_id) return "A role must be selected.";
  if (body.password !== undefined && body.password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireAdmin(createUserClient(req));

    const body = (await req.json()) as CreateUserBody;
    const invalid = validate(body);
    if (invalid) return jsonResponse({ error: invalid }, 400);

    const email = body.email.trim().toLowerCase();
    const admin = createAdminClient();

    // Reject duplicates before touching Auth, so we fail cleanly rather than
    // creating an account that cannot be linked to a profile.
    const { data: clash, error: clashError } = await admin
      .from("users")
      .select("user_id, email, username")
      .or(`email.eq.${email},username.eq.${body.username.trim()}`)
      .maybeSingle();
    if (clashError) throw clashError;
    if (clash) {
      return jsonResponse(
        { error: "An account with this email or username already exists." },
        409
      );
    }

    // Create the auth account. With a password the account is usable
    // immediately; without one the user is emailed an invite and chooses their
    // own password, which is preferable since an administrator should not know
    // another user's credentials.
    let authId: string;
    if (body.password) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: body.password,
        email_confirm: true, // usable at once; no confirmation email required
      });
      if (error) throw error;
      authId = data.user.id;
    } else {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
      if (error) throw error;
      authId = data.user.id;
    }

    // Link the profile. If this fails, remove the auth account so we do not
    // leave an orphan that can sign in but has no profile (and, thanks to
    // has_active_profile(), no access to anything).
    const { data: profile, error: profileError } = await admin
      .from("users")
      .insert({
        auth_id: authId,
        role_id: body.role_id,
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        email,
        username: body.username.trim(),
      })
      .select("*, user_roles(*)")
      .single();

    if (profileError) {
      await admin.auth.admin.deleteUser(authId);
      throw profileError;
    }

    return jsonResponse({ user: profile, invited: !body.password });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return jsonResponse({ error: err.message }, err.status);
    }
    const message = err instanceof Error ? err.message : "Could not create the account";
    return jsonResponse({ error: message }, 400);
  }
});
