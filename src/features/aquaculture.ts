import { supabase } from "@/lib/supabase";
import type {
  AquaCycleStatus,
  AquaSiteType,
  AquacultureCycle,
  AquacultureSite,
  WaterEnvironment,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Aquaculture sites
// ---------------------------------------------------------------------------

export interface AquacultureSiteInput {
  farmer_id: number;
  site_name: string;
  barangay: string;
  site_type: AquaSiteType;
  water_environment: WaterEnvironment;
  area_size: number | null;
}

export interface AquacultureSitePage {
  rows: AquacultureSite[];
  total: number;
}

export async function fetchAquacultureSites(
  search = "",
  page = 1,
  pageSize = 12
): Promise<AquacultureSitePage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("aquaculture_sites")
    .select("*, farmers(first_name, last_name)", { count: "exact" })
    .order("site_name")
    .range(from, to);
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`site_name.ilike.${term},barangay.ilike.${term}`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as AquacultureSite[]) ?? [], total: count ?? 0 };
}

export async function createAquacultureSite(
  input: AquacultureSiteInput
): Promise<AquacultureSite> {
  const { data, error } = await supabase.from("aquaculture_sites").insert(input).select().single();
  if (error) throw error;
  return data as AquacultureSite;
}

export async function updateAquacultureSite(
  id: number,
  input: AquacultureSiteInput
): Promise<AquacultureSite> {
  const { data, error } = await supabase
    .from("aquaculture_sites")
    .update(input)
    .eq("site_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as AquacultureSite;
}

export async function deleteAquacultureSite(id: number): Promise<void> {
  const { error } = await supabase.from("aquaculture_sites").delete().eq("site_id", id);
  if (error) throw error;
}

export interface AquacultureSiteOption {
  site_id: number;
  site_name: string;
  barangay: string;
}

export async function fetchAquacultureSiteOptions(): Promise<AquacultureSiteOption[]> {
  const { data, error } = await supabase
    .from("aquaculture_sites")
    .select("site_id, site_name, barangay")
    .order("site_name");
  if (error) throw error;
  return (data as AquacultureSiteOption[]) ?? [];
}

// ---------------------------------------------------------------------------
// Aquaculture cycles (stocking → harvest)
// ---------------------------------------------------------------------------

export interface AquacultureCycleInput {
  site_id: number;
  species_name: string;
  stocking_date: string;
  stocking_qty: number | null;
  harvest_date: string | null;
  harvest_qty: number | null;
  unit: string;
  status: AquaCycleStatus;
}

export interface AquacultureCyclePage {
  rows: AquacultureCycle[];
  total: number;
}

export async function fetchAquacultureCycles(
  search = "",
  page = 1,
  pageSize = 12
): Promise<AquacultureCyclePage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("aquaculture_cycles")
    .select("*, aquaculture_sites(site_name, barangay)", { count: "exact" })
    .order("stocking_date", { ascending: false })
    .range(from, to);
  if (search.trim()) {
    query = query.ilike("species_name", `%${search.trim()}%`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as AquacultureCycle[]) ?? [], total: count ?? 0 };
}

export async function createAquacultureCycle(
  input: AquacultureCycleInput
): Promise<AquacultureCycle> {
  const { data, error } = await supabase.from("aquaculture_cycles").insert(input).select().single();
  if (error) throw error;
  return data as AquacultureCycle;
}

export async function updateAquacultureCycle(
  id: number,
  input: AquacultureCycleInput
): Promise<AquacultureCycle> {
  const { data, error } = await supabase
    .from("aquaculture_cycles")
    .update(input)
    .eq("cycle_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as AquacultureCycle;
}

export async function deleteAquacultureCycle(id: number): Promise<void> {
  const { error } = await supabase.from("aquaculture_cycles").delete().eq("cycle_id", id);
  if (error) throw error;
}
