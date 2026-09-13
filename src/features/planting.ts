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

export interface PlantingPage { rows: PlantingRecord[]; total: number; }

export interface PlantingFilters {
  status?: PlantingStatus | "ALL";
  cropId?: number | "ALL";
  from?: string;
  to?: string;
}

export async function fetchPlantingRecords(
  search = "",
  page = 1,
  pageSize = 12,
  filters: PlantingFilters = {}
): Promise<PlantingPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("planting_records")
    .select(
      "*, crops(crop_name), farm_plots(plot_number, farms(farm_name, barangay))",
      { count: "exact" }
    )
    .order("planting_date", { ascending: false });

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`crops.crop_name.ilike.${term},planting_status.ilike.${term}`);
  }

  if (filters.status && filters.status !== "ALL") {
    query = query.eq("planting_status", filters.status);
  }

  if (filters.cropId && filters.cropId !== "ALL") {
    query = query.eq("crop_id", filters.cropId);
  }

  if (filters.from) {
    query = query.gte("planting_date", filters.from);
  }

  if (filters.to) {
    query = query.lte("planting_date", filters.to);
  }

  query = query.range(from, to);
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data as PlantingRecord[]) ?? [], total: count ?? 0 };
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

export interface HarvestPage { rows: HarvestInventory[]; total: number; }

export interface HarvestFilters {
  cropName?: string | "ALL";
  from?: string;
  to?: string;
}

export async function fetchHarvests(
  page = 1,
  pageSize = 12,
  search = "",
  filters: HarvestFilters = {}
): Promise<HarvestPage> {
  let query = supabase
    .from("harvest_inventory")
    .select(
      "*, planting_records(planting_id, planting_date, crops(crop_name), farm_plots(plot_number, farms(farm_name, barangay)))",
      { count: "exact" }
    )
    .order("harvested_at", { ascending: false });

  if (filters.from) {
    query = query.gte("harvested_at", filters.from);
  }
  if (filters.to) {
    query = query.lte("harvested_at", `${filters.to}T23:59:59.999Z`);
  }

  const hasSearch = Boolean(search.trim());
  const hasCropFilter = filters.cropName && filters.cropName !== "ALL";

  if (!hasSearch && !hasCropFilter) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);
    if (error) throw error;
    return { rows: (data as HarvestInventory[]) ?? [], total: count ?? 0 };
  }

  const { data, error } = await query;
  if (error) throw error;
  let allRows = (data as HarvestInventory[]) ?? [];

  if (hasCropFilter) {
    allRows = allRows.filter((h) => h.planting_records?.crops?.crop_name === filters.cropName);
  }

  if (hasSearch) {
    const q = search.trim().toLowerCase();
    allRows = allRows.filter((h) => {
      const crop = h.planting_records?.crops?.crop_name?.toLowerCase() ?? "";
      const farm = h.planting_records?.farm_plots?.farms?.farm_name?.toLowerCase() ?? "";
      const barangay = h.planting_records?.farm_plots?.farms?.barangay?.toLowerCase() ?? "";
      const plot = String(h.planting_records?.farm_plots?.plot_number ?? "").toLowerCase();
      const unit = h.unit?.toLowerCase() ?? "";
      const date = h.harvested_at ? new Date(h.harvested_at).toLocaleDateString().toLowerCase() : "";
      return (
        crop.includes(q) ||
        farm.includes(q) ||
        barangay.includes(q) ||
        plot.includes(q) ||
        unit.includes(q) ||
        date.includes(q)
      );
    });
  }

  const from = (page - 1) * pageSize;
  const paged = allRows.slice(from, from + pageSize);
  return { rows: paged, total: allRows.length };
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
