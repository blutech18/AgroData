import { createClient } from "@supabase/supabase-js";
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
  password: string;
}

/**
 * Isolated auth client used only for creating accounts. It uses a distinct
 * storage key and does not persist a session, so it never overwrites or shares
 * state with the main (admin) client.
 */
const accountCreationClient = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: "agrodata-account-creation",
    },
  }
);

/**
 * Creates a new OMA login account and its linked profile in one step.
 *
 * The sign-up runs on an isolated Supabase client so the current administrator's
 * session is never replaced. The profile row is then inserted using the admin's
 * authenticated client, so the admin-only RLS policy on public.users is satisfied.
 */
export async function createUserAccount(input: NewUserInput): Promise<AppUser> {
  const { data: signUp, error: signUpError } = await accountCreationClient.auth.signUp({
    email: input.email,
    password: input.password,
  });
  if (signUpError) throw signUpError;

  const authId = signUp.user?.id;
  if (!authId) {
    throw new Error("The authentication account could not be created.");
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      auth_id: authId,
      role_id: input.role_id,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      username: input.username,
    })
    .select("*, user_roles(*)")
    .single();
  if (error) throw error;
  return data as AppUser;
}
