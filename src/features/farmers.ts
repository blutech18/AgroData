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

export interface FarmerSectors {
  crops: boolean;
  livestock: boolean;
  fisheries: boolean;
  aquaculture: boolean;
}

export type SectorKey = keyof FarmerSectors;

export const SECTOR_SOURCES: { key: SectorKey; table: string }[] = [
  { key: "crops", table: "farms" },
  { key: "livestock", table: "livestock_records" },
  { key: "fisheries", table: "fisherfolk" },
  { key: "aquaculture", table: "aquaculture_sites" },
];

export interface FarmerFilters {
  sex?: Sex | "ALL";
  barangay?: string | "ALL";
  sector?: keyof FarmerSectors | "ALL";
  from?: string;
  to?: string;
}

export async function fetchDistinctBarangays(): Promise<string[]> {
  const { data, error } = await supabase
    .from("farmers")
    .select("barangay")
    .not("barangay", "is", null);
  if (error) throw error;
  const unique = Array.from(
    new Set(
      (data as { barangay: string }[])
        ?.map((d) => d.barangay?.trim())
        .filter(Boolean) ?? []
    )
  );
  return unique.sort();
}

export async function fetchFarmers(
  search = "",
  page = 1,
  pageSize = 12,
  filters: FarmerFilters = {}
): Promise<FarmerPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("farmers")
    .select("*", { count: "exact" })
    .order("last_name", { ascending: true });

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},barangay.ilike.${term},contact_no.ilike.${term}`
    );
  }

  if (filters.sex && filters.sex !== "ALL") {
    query = query.eq("sex", filters.sex);
  }

  if (filters.barangay && filters.barangay !== "ALL") {
    query = query.eq("barangay", filters.barangay);
  }

  if (filters.from) {
    query = query.gte("registration_date", filters.from);
  }

  if (filters.to) {
    query = query.lte("registration_date", `${filters.to}T23:59:59.999Z`);
  }

  if (filters.sector && filters.sector !== "ALL") {
    const source = SECTOR_SOURCES.find((s) => s.key === filters.sector);
    if (source) {
      const { data: sectorRows, error: sectorErr } = await supabase
        .from(source.table)
        .select("farmer_id");
      if (sectorErr) throw sectorErr;
      const ids = Array.from(
        new Set(
          (sectorRows as { farmer_id?: number | null }[])
            ?.map((r) => r.farmer_id)
            .filter((id): id is number => typeof id === "number") ?? []
        )
      );
      if (ids.length === 0) {
        return { rows: [], total: 0 };
      }
      query = query.in("farmer_id", ids);
    }
  }

  query = query.range(from, to);

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

/** Collapses casing and whitespace so "  Dela  Cruz " matches "dela cruz". */
export const normalizeName = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

export interface DuplicateCandidateInput {
  first_name: string;
  last_name: string;
  birthdate: string;
  barangay: string;
}

/**
 * The duplicate rule: same normalized first and last name, plus either the same
 * birthdate or the same barangay. Names alone are too weak (namesakes are
 * common), and requiring all four fields would only repeat what the database
 * unique constraint already rejects.
 */
export function isPossibleDuplicate(
  candidate: Pick<Farmer, "first_name" | "last_name" | "birthdate" | "barangay">,
  input: DuplicateCandidateInput
): boolean {
  const sameName =
    normalizeName(candidate.first_name) === normalizeName(input.first_name) &&
    normalizeName(candidate.last_name) === normalizeName(input.last_name);
  if (!sameName) return false;

  return (
    candidate.birthdate === input.birthdate ||
    normalizeName(candidate.barangay) === normalizeName(input.barangay)
  );
}

/**
 * Returns existing producers that look like the one being registered: the same
 * normalized first and last name plus a matching birthdate or barangay.
 */
export async function findPossibleDuplicates(
  input: Pick<FarmerInput, "first_name" | "last_name" | "birthdate" | "barangay">,
  excludeId?: number
): Promise<Farmer[]> {
  const first = normalizeName(input.first_name);
  const last = normalizeName(input.last_name);
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

  return ((data as Farmer[]) ?? []).filter((f) => isPossibleDuplicate(f, input));
}

// ---------------------------------------------------------------------------
// Cross-sector participation of the unified producer registry
// ---------------------------------------------------------------------------

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
  barangay: string;
}

/** Lightweight list of producers for select inputs (livestock, fisheries, aquaculture). */
export async function fetchFarmerOptions(): Promise<FarmerOption[]> {
  const { data, error } = await supabase
    .from("farmers")
    .select("farmer_id, first_name, last_name, barangay")
    .order("last_name");
  if (error) throw error;
  return (data as FarmerOption[]) ?? [];
}
