import { supabase } from "@/lib/supabase";
import type { FarmPlot, HarvestInventory, PlantingRecord, PlantingStatus } from "@/types/database";

export interface PlantingInput {
  plot_id: number;
  crop_id: number;
  planting_date: string;
  expected_harvest_date: string | null;
  actual_harvest_date: string | null;
  area_planted: number;
  quantity_planted: number | null;
  planting_unit: string;
  planting_status: PlantingStatus;
}

export async function fetchPlantingRecords(page = 1, pageSize = 10): Promise<{ data: PlantingRecord[], count: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await supabase
    .from("planting_records")
    .select(
      "*, crops(crop_name), farm_plots(plot_number, farms(farm_name, barangay))",
      { count: "exact" }
    )
    .order("planting_date", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { data: (data as PlantingRecord[]) ?? [], count: count ?? 0 };
}

export async function fetchPlotOptions(): Promise<FarmPlot[]> {
  const { data, error } = await supabase
    .from("farm_plots")
    .select("*, farms(farm_name, barangay)")
    .eq("status", "ACTIVE")
    .order("plot_number");
  if (error) throw error;
  return (data as FarmPlot[]) ?? [];
}

export async function createPlanting(input: PlantingInput): Promise<PlantingRecord> {
  const { data, error } = await supabase.from("planting_records").insert(input).select().single();
  if (error) throw error;
  return data as PlantingRecord;
}

export async function updatePlanting(id: number, input: PlantingInput): Promise<PlantingRecord> {
  const { data, error } = await supabase
    .from("planting_records")
    .update(input)
    .eq("planting_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as PlantingRecord;
}

export async function deletePlanting(id: number): Promise<void> {
  const { error } = await supabase.from("planting_records").delete().eq("planting_id", id);
  if (error) throw error;
}

// ---- Harvest inventory ----
export interface HarvestInput {
  planting_id: number;
  quantity_harvested: number;
  unit: string;
}

export async function fetchHarvests(page = 1, pageSize = 10): Promise<{ data: HarvestInventory[], count: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await supabase
    .from("harvest_inventory")
    .select(
      "*, planting_records(planting_id, planting_date, crops(crop_name), farm_plots(plot_number, farms(farm_name, barangay)))",
      { count: "exact" }
    )
    .order("harvested_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { data: (data as HarvestInventory[]) ?? [], count: count ?? 0 };
}

export async function fetchHarvestablePlantings(): Promise<PlantingRecord[]> {
  const { data, error } = await supabase
    .from("planting_records")
    .select("*, crops(crop_name), farm_plots(plot_number, farms(farm_name, barangay))")
    .order("planting_date", { ascending: false });
  if (error) throw error;
  return (data as PlantingRecord[]) ?? [];
}

export async function createHarvest(input: HarvestInput): Promise<HarvestInventory> {
  const { data, error } = await supabase.from("harvest_inventory").insert(input).select().single();
  if (error) throw error;
  // Mark the related planting as harvested.
  await supabase
    .from("planting_records")
    .update({ planting_status: "HARVESTED", actual_harvest_date: new Date().toISOString().slice(0, 10) })
    .eq("planting_id", input.planting_id);
  return data as HarvestInventory;
}

export async function deleteHarvest(id: number): Promise<void> {
  const { error } = await supabase.from("harvest_inventory").delete().eq("inventory_id", id);
  if (error) throw error;
}
