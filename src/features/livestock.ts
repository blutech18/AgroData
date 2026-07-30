import { supabase } from "@/lib/supabase";
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

export async function fetchLivestockRecords(
  search = "",
  page = 1,
  pageSize = 12
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
    query = query.ilike("barangay", term);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as LivestockRecord[]) ?? [], total: count ?? 0 };
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
