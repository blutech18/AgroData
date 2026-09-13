import { supabase } from "@/lib/supabase";
import { todayISO } from "@/lib/utils";
import type {
  AnimalProductType,
  LivestockCategory,
  LivestockRecord,
  LivestockSpecies,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Livestock species (reference catalog)
// ---------------------------------------------------------------------------

export interface SpeciesInput {
  species_name: string;
  category: LivestockCategory;
  primary_product: string | null;
}

export async function fetchLivestockSpecies(): Promise<LivestockSpecies[]> {
  const { data, error } = await supabase
    .from("livestock_species")
    .select("*")
    .order("category")
    .order("species_name");
  if (error) throw error;
  return (data as LivestockSpecies[]) ?? [];
}

export async function createLivestockSpecies(input: SpeciesInput): Promise<LivestockSpecies> {
  const { data, error } = await supabase.from("livestock_species").insert(input).select().single();
  if (error) throw error;
  return data as LivestockSpecies;
}

export async function updateLivestockSpecies(
  id: number,
  input: SpeciesInput
): Promise<LivestockSpecies> {
  const { data, error } = await supabase
    .from("livestock_species")
    .update(input)
    .eq("species_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as LivestockSpecies;
}

export async function deleteLivestockSpecies(id: number): Promise<void> {
  const { error } = await supabase.from("livestock_species").delete().eq("species_id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Livestock records (periodic inventory + events + production)
// ---------------------------------------------------------------------------

export interface LivestockRecordInput {
  farmer_id: number;
  species_id: number;
  barangay: string;
  record_date: string;
  inventory_count: number;
  births: number;
  deaths: number;
  disposed: number;
  production_type: AnimalProductType | null;
  production_qty: number | null;
  production_unit: string | null;
  notes: string | null;
}

export interface LivestockRecordPage {
  rows: LivestockRecord[];
  total: number;
}

export interface LivestockFilters {
  speciesId?: number;
  barangay?: string;
  /** Inclusive lower bound on record_date (YYYY-MM-DD). */
  from?: string;
  /** Inclusive upper bound on record_date (YYYY-MM-DD). */
  to?: string;
}

export async function fetchLivestockRecords(
  search = "",
  page = 1,
  pageSize = 12,
  filters: LivestockFilters = {}
): Promise<LivestockRecordPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("livestock_records")
    .select(
      "*, farmers(first_name, last_name), livestock_species(species_name, category)",
      { count: "exact" }
    )
    .order("record_date", { ascending: false })
    .range(from, to);
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`barangay.ilike.${term},notes.ilike.${term}`);
  }
  if (filters.speciesId) query = query.eq("species_id", filters.speciesId);
  if (filters.barangay) query = query.eq("barangay", filters.barangay);
  if (filters.from) query = query.gte("record_date", filters.from);
  if (filters.to) query = query.lte("record_date", filters.to);
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as LivestockRecord[]) ?? [], total: count ?? 0 };
}

export async function fetchDistinctLivestockBarangays(): Promise<string[]> {
  const { data, error } = await supabase
    .from("livestock_records")
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

export async function createLivestockRecord(input: LivestockRecordInput): Promise<LivestockRecord> {
  const { data, error } = await supabase.from("livestock_records").insert(input).select().single();
  if (error) throw error;
  return data as LivestockRecord;
}

export async function updateLivestockRecord(
  id: number,
  input: LivestockRecordInput
): Promise<LivestockRecord> {
  const { data, error } = await supabase
    .from("livestock_records")
    .update(input)
    .eq("record_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as LivestockRecord;
}

export async function deleteLivestockRecord(id: number): Promise<void> {
  const { error } = await supabase.from("livestock_records").delete().eq("record_id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Business validation (pure — safe to unit test and to call before saving)
// ---------------------------------------------------------------------------

/**
 * Validates a livestock record beyond the database's non-negative checks:
 * rejects future record dates, prevents losses (deaths + disposed) from
 * exceeding the animals that could plausibly be present in the period
 * (recorded inventory + births), and enforces production type/quantity/unit
 * consistency. Returns a human-readable message, or null when the record is
 * acceptable.
 */
export function validateLivestockRecord(
  input: LivestockRecordInput,
  today: string = todayISO()
): string | null {
  if (!input.record_date) return "Record date is required.";
  if (input.record_date > today) return "Record date cannot be in the future.";

  const inventory = Number(input.inventory_count ?? 0);
  const births = Number(input.births ?? 0);
  const deaths = Number(input.deaths ?? 0);
  const disposed = Number(input.disposed ?? 0);
  if ([inventory, births, deaths, disposed].some((n) => n < 0 || !Number.isFinite(n))) {
    return "Counts must be zero or a positive number.";
  }
  if (deaths + disposed > inventory + births) {
    return "Deaths and dispositions cannot exceed the recorded inventory plus births.";
  }

  const qty = input.production_qty;
  const hasType = input.production_type != null;
  const hasQty = qty != null && qty > 0;
  const hasUnit = !!(input.production_unit && input.production_unit.trim());
  if (qty != null && (qty < 0 || !Number.isFinite(qty))) {
    return "Production quantity must be zero or a positive number.";
  }
  if (hasQty && !hasType) return "Select a production type for the recorded production quantity.";
  if (hasQty && !hasUnit) return "Enter a unit for the recorded production quantity.";
  if (hasType && !hasQty) return "Enter a production quantity for the selected production type.";

  return null;
}
