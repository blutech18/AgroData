import { supabase } from "@/lib/supabase";
import { todayISO } from "@/lib/utils";
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

export interface FisherfolkFilters {
  involvement?: FishingInvolvement;
  barangay?: string;
}

export async function fetchFisherfolk(
  search = "",
  page = 1,
  pageSize = 12,
  filters: FisherfolkFilters = {}
): Promise<FisherfolkPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("fisherfolk")
    .select("*, farmers(first_name, last_name)", { count: "exact" })
    .order("registered_at", { ascending: false })
    .range(from, to);
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`barangay.ilike.${term},vessel_type.ilike.${term},gear_type.ilike.${term}`);
  }
  if (filters.involvement) query = query.eq("involvement", filters.involvement);
  if (filters.barangay) query = query.eq("barangay", filters.barangay);
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as Fisherfolk[]) ?? [], total: count ?? 0 };
}

export async function fetchDistinctFisherfolkBarangays(): Promise<string[]> {
  const { data, error } = await supabase
    .from("fisherfolk")
    .select("barangay")
    .not("barangay", "is", null);
  if (error) return [];
  const set = new Set<string>();
  for (const row of (data as { barangay: string }[]) ?? []) {
    if (row.barangay && row.barangay.trim()) {
      set.add(row.barangay.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
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

/**
 * Producer IDs that already have a fisherfolk profile. Each producer may only
 * have one (the DB enforces a unique farmer_id), so the registration form uses
 * this to hide producers that are already registered.
 */
export async function fetchRegisteredFisherfolkFarmerIds(): Promise<number[]> {
  const { data, error } = await supabase.from("fisherfolk").select("farmer_id");
  if (error) throw error;
  return ((data as { farmer_id: number }[]) ?? []).map((r) => r.farmer_id);
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

export interface FishCatchFilters {
  subsector?: FisheriesSubsector;
  /** Exact species match (from the aquatic species catalog). */
  species?: string;
  /** Inclusive lower bound on catch_date (YYYY-MM-DD). */
  from?: string;
  /** Inclusive upper bound on catch_date (YYYY-MM-DD). */
  to?: string;
}

export async function fetchFishCatch(
  search = "",
  page = 1,
  pageSize = 12,
  filters: FishCatchFilters = {}
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
  if (filters.subsector) query = query.eq("subsector", filters.subsector);
  if (filters.species) query = query.eq("species_name", filters.species);
  if (filters.from) query = query.gte("catch_date", filters.from);
  if (filters.to) query = query.lte("catch_date", filters.to);
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

// ---------------------------------------------------------------------------
// Business validation (pure — safe to unit test and to call before saving)
// ---------------------------------------------------------------------------

/**
 * Validates a fish catch record: rejects future catch dates, requires a named
 * species and a unit, and requires a catch quantity greater than zero (a
 * zero-quantity catch is not a meaningful record). Returns a human-readable
 * message, or null when the record is acceptable.
 */
export function validateFishCatch(
  input: FishCatchInput,
  today: string = todayISO()
): string | null {
  if (!input.catch_date) return "Catch date is required.";
  if (input.catch_date > today) return "Catch date cannot be in the future.";
  if (!input.species_name.trim()) return "Species is required.";
  if (!input.unit.trim()) return "Unit is required.";
  const qty = Number(input.quantity ?? 0);
  if (!Number.isFinite(qty) || qty <= 0) return "Catch quantity must be greater than zero.";
  return null;
}
