import { supabase } from "@/lib/supabase";
import type {
  FishCatch,
  Fisherfolk,
  FisheriesSubsector,
  FishingInvolvement,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Fisherfolk (sector profile attached to a producer)
// ---------------------------------------------------------------------------

export interface FisherfolkInput {
  farmer_id: number;
  barangay: string;
  involvement: FishingInvolvement;
  vessel_type: string | null;
  gear_type: string | null;
}

export interface FisherfolkPage {
  rows: Fisherfolk[];
  total: number;
}

export async function fetchFisherfolk(
  search = "",
  page = 1,
  pageSize = 12
): Promise<FisherfolkPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("fisherfolk")
    .select("*, farmers(first_name, last_name)", { count: "exact" })
    .order("registered_at", { ascending: false })
    .range(from, to);
  if (search.trim()) {
    query = query.ilike("barangay", `%${search.trim()}%`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as Fisherfolk[]) ?? [], total: count ?? 0 };
}

export async function createFisherfolk(input: FisherfolkInput): Promise<Fisherfolk> {
  const { data, error } = await supabase.from("fisherfolk").insert(input).select().single();
  if (error) throw error;
  return data as Fisherfolk;
}

export async function updateFisherfolk(id: number, input: FisherfolkInput): Promise<Fisherfolk> {
  const { data, error } = await supabase
    .from("fisherfolk")
    .update(input)
    .eq("fisherfolk_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Fisherfolk;
}

export async function deleteFisherfolk(id: number): Promise<void> {
  const { error } = await supabase.from("fisherfolk").delete().eq("fisherfolk_id", id);
  if (error) throw error;
}

export interface FisherfolkOption {
  fisherfolk_id: number;
  barangay: string;
  farmers?: { first_name: string; last_name: string } | null;
}

export async function fetchFisherfolkOptions(): Promise<FisherfolkOption[]> {
  const { data, error } = await supabase
    .from("fisherfolk")
    .select("fisherfolk_id, barangay, farmers(first_name, last_name)")
    .order("fisherfolk_id");
  if (error) throw error;
  return (data as unknown as FisherfolkOption[]) ?? [];
}

// ---------------------------------------------------------------------------
// Fish catch records
// ---------------------------------------------------------------------------

export interface FishCatchInput {
  fisherfolk_id: number;
  catch_date: string;
  subsector: FisheriesSubsector;
  species_name: string;
  quantity: number;
  unit: string;
  notes: string | null;
}

export interface FishCatchPage {
  rows: FishCatch[];
  total: number;
}

export async function fetchFishCatch(
  search = "",
  page = 1,
  pageSize = 12
): Promise<FishCatchPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("fish_catch")
    .select("*, fisherfolk(barangay, farmers(first_name, last_name))", { count: "exact" })
    .order("catch_date", { ascending: false })
    .range(from, to);
  if (search.trim()) {
    query = query.ilike("species_name", `%${search.trim()}%`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as FishCatch[]) ?? [], total: count ?? 0 };
}

export async function createFishCatch(input: FishCatchInput): Promise<FishCatch> {
  const { data, error } = await supabase.from("fish_catch").insert(input).select().single();
  if (error) throw error;
  return data as FishCatch;
}

export async function updateFishCatch(id: number, input: FishCatchInput): Promise<FishCatch> {
  const { data, error } = await supabase
    .from("fish_catch")
    .update(input)
    .eq("catch_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as FishCatch;
}

export async function deleteFishCatch(id: number): Promise<void> {
  const { error } = await supabase.from("fish_catch").delete().eq("catch_id", id);
  if (error) throw error;
}
