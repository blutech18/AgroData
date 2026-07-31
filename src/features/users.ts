import { supabase } from "@/lib/supabase";
import type { AppUser, UserRole } from "@/types/database";

export interface UserPage { rows: AppUser[]; total: number; }

export async function fetchUsers(
  search = "",
  page = 1,
  pageSize = 12
): Promise<UserPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("users")
    .select("*, user_roles(*)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},username.ilike.${term}`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as AppUser[]) ?? [], total: count ?? 0 };
}

export async function fetchRoles(): Promise<UserRole[]> {
  const { data, error } = await supabase.from("user_roles").select("*").order("role_name");
  if (error) throw error;
  return (data as UserRole[]) ?? [];
}

export interface UserProfileInput {
  role_id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
}

/**
 * Updates an OMA user profile (role, name, status). Creating the underlying
 * auth account is done via Supabase Auth (see README) and then linked here.
 */
export async function updateUserProfile(id: number, input: Partial<UserProfileInput>) {
  const { data, error } = await supabase
    .from("users")
    .update(input)
    .eq("user_id", id)
    .select("*, user_roles(*)")
    .single();
  if (error) throw error;
  return data as AppUser;
}

export async function setUserStatus(id: number, status: "ACTIVE" | "INACTIVE") {
  const { error } = await supabase
    .from("users")
    .update({ account_status: status })
    .eq("user_id", id);
  if (error) throw error;
}

export interface NewUserInput extends UserProfileInput {
  /**
   * Optional. Leave empty to email the user an invitation so they choose their
   * own password, which is preferable to an administrator setting it for them.
   */
  password?: string;
}

export interface CreatedUser {
  user: AppUser;
  /** True when an invitation email was sent instead of setting a password. */
  invited: boolean;
}

/**
 * Creates an OMA login account and its linked profile via the `create-oma-user`
 * Edge Function.
 *
 * This runs server-side because it needs the Auth admin API: the function
 * creates the account, links the profile, and deletes the account again if
 * linking fails, so a half-provisioned user cannot be left behind. It also
 * avoids client-side signUp, which would leave the account unconfirmed whenever
 * email confirmation is enabled on the project.
 */
export async function createUserAccount(input: NewUserInput): Promise<CreatedUser> {
  const { data, error } = await supabase.functions.invoke("create-oma-user", {
    body: {
      email: input.email,
      username: input.username,
      first_name: input.first_name,
      last_name: input.last_name,
      role_id: input.role_id,
      ...(input.password ? { password: input.password } : {}),
    },
  });

  // Edge Function errors carry the useful message in the response body.
  if (error) {
    const detail = (data as { error?: string } | null)?.error;
    throw new Error(detail ?? error.message);
  }
  if ((data as { error?: string } | null)?.error) {
    throw new Error((data as { error: string }).error);
  }

  return data as CreatedUser;
}
