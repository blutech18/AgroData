import { supabase } from "@/lib/supabase";
import type { Farmer, Sex } from "@/types/database";

export interface FarmerInput {
  first_name: string;
  last_name: string;
  sex: Sex;
  birthdate: string;
  contact_no: string;
  address: string;
  barangay: string;
}

export interface FarmerPage {
  rows: Farmer[];
  total: number;
}

export async function fetchFarmers(
  search = "",
  page = 1,
  pageSize = 12
): Promise<FarmerPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("farmers")
    .select("*", { count: "exact" })
    .order("last_name", { ascending: true })
    .range(from, to);

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},barangay.ilike.${term},contact_no.ilike.${term}`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as Farmer[]) ?? [], total: count ?? 0 };
}

export async function createFarmer(input: FarmerInput): Promise<Farmer> {
  const { data, error } = await supabase.from("farmers").insert(input).select().single();
  if (error) throw error;
  return data as Farmer;
}

export async function updateFarmer(id: number, input: FarmerInput): Promise<Farmer> {
  const { data, error } = await supabase
    .from("farmers")
    .update(input)
    .eq("farmer_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Farmer;
}

export async function deleteFarmer(id: number): Promise<void> {
  const { error } = await supabase.from("farmers").delete().eq("farmer_id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Duplicate producer detection (Objective 2 / Register Producer AF-1)
// The database enforces a hard unique constraint on
// (first_name, last_name, birthdate, barangay). This softer check runs before
// saving so staff can review a possible duplicate instead of hitting an error.
// ---------------------------------------------------------------------------

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Returns existing producers that look like the one being registered: the same
 * normalized first and last name plus a matching birthdate or barangay.
 */
export async function findPossibleDuplicates(
  input: Pick<FarmerInput, "first_name" | "last_name" | "birthdate" | "barangay">,
  excludeId?: number
): Promise<Farmer[]> {
  const first = normalize(input.first_name);
  const last = normalize(input.last_name);
  if (!first || !last) return [];

  let query = supabase
    .from("farmers")
    .select("*")
    .ilike("last_name", last)
    .ilike("first_name", first)
    .limit(10);

  if (excludeId) query = query.neq("farmer_id", excludeId);

  const { data, error } = await query;
  if (error) throw error;

  const barangay = normalize(input.barangay);
  return ((data as Farmer[]) ?? []).filter(
    (f) => f.birthdate === input.birthdate || normalize(f.barangay) === barangay
  );
}

// ---------------------------------------------------------------------------
// Cross-sector participation of the unified producer registry
// ---------------------------------------------------------------------------

export interface FarmerSectors {
  crops: boolean;
  livestock: boolean;
  fisheries: boolean;
  aquaculture: boolean;
}

type SectorKey = keyof FarmerSectors;

const SECTOR_SOURCES: { key: SectorKey; table: string }[] = [
  { key: "crops", table: "farms" },
  { key: "livestock", table: "livestock_records" },
  { key: "fisheries", table: "fisherfolk" },
  { key: "aquaculture", table: "aquaculture_sites" },
];

/**
 * Resolves which agricultural sectors each producer participates in. A single
 * producer identity may be linked to crop, livestock/poultry, fisheries, and
 * aquaculture records at the same time.
 */
export async function fetchFarmerSectors(
  farmerIds: number[]
): Promise<Record<number, FarmerSectors>> {
  const result: Record<number, FarmerSectors> = {};
  if (farmerIds.length === 0) return result;

  for (const id of farmerIds) {
    result[id] = { crops: false, livestock: false, fisheries: false, aquaculture: false };
  }

  const responses = await Promise.all(
    SECTOR_SOURCES.map(({ table }) =>
      supabase.from(table).select("farmer_id").in("farmer_id", farmerIds)
    )
  );

  responses.forEach((response, index) => {
    if (response.error) throw response.error;
    const { key } = SECTOR_SOURCES[index];
    for (const row of (response.data as { farmer_id: number }[]) ?? []) {
      const sectors = result[row.farmer_id];
      if (sectors) sectors[key] = true;
    }
  });

  return result;
}

export interface FarmerOption {
  farmer_id: number;
  first_name: string;
  last_name: string;
}

/** Lightweight list of producers for select inputs (livestock, fisheries, aquaculture). */
export async function fetchFarmerOptions(): Promise<FarmerOption[]> {
  const { data, error } = await supabase
    .from("farmers")
    .select("farmer_id, first_name, last_name")
    .order("last_name");
  if (error) throw error;
  return (data as FarmerOption[]) ?? [];
}
