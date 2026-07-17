import { supabase } from "@/lib/supabase";
import type { Farm, Farmer, FarmPlot, IrrigationType, SoilType } from "@/types/database";

export interface FarmInput {
  farmer_id: number;
  farm_name: string;
  barangay: string;
  total_area: number | null;
  soil_type: SoilType | null;
  irrigation_type: IrrigationType | null;
}

export interface FarmPage { rows: Farm[]; total: number; }

export async function fetchFarms(
  search = "",
  page = 1,
  pageSize = 12
): Promise<FarmPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("farms")
    .select("*, farmers(first_name, last_name)", { count: "exact" })
    .order("farm_name")
    .range(from, to);
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`farm_name.ilike.${term},barangay.ilike.${term}`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as Farm[]) ?? [], total: count ?? 0 };
}

export async function fetchFarmerOptions(): Promise<Pick<Farmer, "farmer_id" | "first_name" | "last_name">[]> {
  const { data, error } = await supabase
    .from("farmers")
    .select("farmer_id, first_name, last_name")
    .order("last_name");
  if (error) throw error;
  return data ?? [];
}

export async function createFarm(input: FarmInput): Promise<Farm> {
  const { data, error } = await supabase.from("farms").insert(input).select().single();
  if (error) throw error;
  return data as Farm;
}

export async function updateFarm(id: number, input: FarmInput): Promise<Farm> {
  const { data, error } = await supabase
    .from("farms")
    .update(input)
    .eq("farm_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Farm;
}

export async function deleteFarm(id: number): Promise<void> {
  const { error } = await supabase.from("farms").delete().eq("farm_id", id);
  if (error) throw error;
}

// ---- Farm plots ----
export interface PlotInput {
  farm_id: number;
  plot_number: string;
  plot_size: number;
  status: "ACTIVE" | "FALLOW";
}

export interface PlotPage { rows: FarmPlot[]; total: number; }

export async function fetchPlots(
  search = "",
  page = 1,
  pageSize = 12
): Promise<PlotPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("farm_plots")
    .select("*, farms(farm_name, barangay)", { count: "exact" })
    .order("plot_id", { ascending: false })
    .range(from, to);
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`plot_number.ilike.${term}`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as FarmPlot[]) ?? [], total: count ?? 0 };
}

export async function fetchFarmOptions(): Promise<Pick<Farm, "farm_id" | "farm_name" | "barangay">[]> {
  const { data, error } = await supabase
    .from("farms")
    .select("farm_id, farm_name, barangay")
    .order("farm_name");
  if (error) throw error;
  return (data as Pick<Farm, "farm_id" | "farm_name" | "barangay">[]) ?? [];
}

export async function createPlot(input: PlotInput): Promise<FarmPlot> {
  const { data, error } = await supabase.from("farm_plots").insert(input).select().single();
  if (error) throw error;
  return data as FarmPlot;
}

export async function updatePlot(id: number, input: PlotInput): Promise<FarmPlot> {
  const { data, error } = await supabase
    .from("farm_plots")
    .update(input)
    .eq("plot_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as FarmPlot;
}

export async function deletePlot(id: number): Promise<void> {
  const { error } = await supabase.from("farm_plots").delete().eq("plot_id", id);
  if (error) throw error;
}
