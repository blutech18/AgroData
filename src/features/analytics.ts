import { supabase } from "@/lib/supabase";
import type {
  AquacultureStatistic,
  FisheriesStatistic,
  LivestockStatistic,
  PeriodType,
  YieldStatistic,
} from "@/types/database";

export interface DashboardSummary {
  farmerCount: number;
  farmCount: number;
  cropCount: number;
  activePlantings: number;
  totalAreaPlanted: number;
  totalYield: number;
  animalInventory: number;
  fishCatch: number;
  aquacultureHarvest: number;
}

export interface NamedValue {
  name: string;
  value: number;
}

export interface YieldTrendPoint {
  period: string; // e.g. "2025"
  yield: number;
  area: number;
}

/**
 * A livestock inventory snapshot as encoded per producer + species + barangay
 * on a reference date. Inventory is a *stock* (a count at a point in time), so
 * summing every snapshot double-counts the same animals across dates.
 */
interface LivestockSnapshotRow {
  farmer_id: number;
  species_id: number;
  barangay: string | null;
  record_date: string;
  inventory_count: number;
}

/**
 * Reduces periodic livestock snapshots to the latest inventory per holding
 * (producer + species + barangay). This is the defensible "current inventory"
 * measure: the most recent recorded head count for each holding, never the sum
 * of repeated snapshots of the same animals.
 *
 * Exported for unit testing; also used by the dashboard aggregations below.
 */
export function latestInventoryByHolding<T extends LivestockSnapshotRow>(rows: T[]): T[] {
  const latest = new Map<string, T>();
  for (const r of rows) {
    const key = `${r.farmer_id}|${r.species_id}|${r.barangay ?? ""}`;
    const cur = latest.get(key);
    if (!cur || r.record_date > cur.record_date) latest.set(key, r);
  }
  return [...latest.values()];
}

interface PlantingJoin {
  area_planted: number;
  planting_date: string;
  planting_status: string;
  crops: { crop_name: string } | null;
  farm_plots: { farms: { barangay: string } | null } | null;
}

interface HarvestJoin {
  quantity_harvested: number;
  harvested_at: string;
  planting_records: {
    crops: { crop_name: string } | null;
    farm_plots: { farms: { barangay: string } | null } | null;
  } | null;
}

/** The head-count query builder returned by `.select(..., { head: true })`. */
type CountQuery = ReturnType<ReturnType<typeof supabase.from>["select"]>;

async function countRows(
  table: string,
  filter?: (q: CountQuery) => CountQuery
): Promise<number> {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const [farmerCount, farmCount, cropCount, activePlantings] = await Promise.all([
    countRows("farmers"),
    countRows("farms"),
    countRows("crops"),
    countRows("planting_records", (q) => q.eq("planting_status", "PLANTED")),
  ]);

  // Run the aggregate source reads in parallel and surface any error instead of
  // silently treating a failed query as an empty result (which would render a
  // misleading zero on the dashboard).
  const [plantingsRes, harvestsRes, livestockRes, catchesRes, aquaRes] = await Promise.all([
    supabase.from("planting_records").select("area_planted"),
    supabase.from("harvest_inventory").select("quantity_harvested"),
    supabase
      .from("livestock_records")
      .select("farmer_id, species_id, barangay, record_date, inventory_count"),
    supabase.from("fish_catch").select("quantity"),
    supabase.from("aquaculture_cycles").select("harvest_qty"),
  ]);

  const firstError =
    plantingsRes.error ??
    harvestsRes.error ??
    livestockRes.error ??
    catchesRes.error ??
    aquaRes.error;
  if (firstError) throw firstError;

  const totalAreaPlanted = (plantingsRes.data ?? []).reduce(
    (sum, p: { area_planted: number }) => sum + Number(p.area_planted ?? 0),
    0
  );
  const totalYield = (harvestsRes.data ?? []).reduce(
    (sum, h: { quantity_harvested: number }) => sum + Number(h.quantity_harvested ?? 0),
    0
  );
  // Current inventory = latest snapshot per holding, not the sum of every
  // periodic snapshot (which would count the same animals many times).
  const animalInventory = latestInventoryByHolding(
    (livestockRes.data ?? []) as LivestockSnapshotRow[]
  ).reduce((sum, l) => sum + Number(l.inventory_count ?? 0), 0);
  const fishCatch = (catchesRes.data ?? []).reduce(
    (sum, c: { quantity: number }) => sum + Number(c.quantity ?? 0),
    0
  );
  const aquacultureHarvest = (aquaRes.data ?? []).reduce(
    (sum, a: { harvest_qty: number | null }) => sum + Number(a.harvest_qty ?? 0),
    0
  );

  return {
    farmerCount,
    farmCount,
    cropCount,
    activePlantings,
    totalAreaPlanted,
    totalYield,
    animalInventory,
    fishCatch,
    aquacultureHarvest,
  };
}

/**
 * Livestock/poultry inventory distribution — current recorded inventory per
 * species, using the latest snapshot per holding so repeated periodic records
 * of the same animals are not counted more than once.
 */
export async function fetchLivestockBySpecies(): Promise<NamedValue[]> {
  const { data, error } = await supabase
    .from("livestock_records")
    .select(
      "farmer_id, species_id, barangay, record_date, inventory_count, livestock_species(species_name)"
    );
  if (error) throw error;

  type Row = LivestockSnapshotRow & { livestock_species: { species_name: string } | null };
  const latest = latestInventoryByHolding((data ?? []) as unknown as Row[]);

  const map = new Map<string, number>();
  for (const row of latest) {
    const name = row.livestock_species?.species_name ?? "Unknown";
    map.set(name, (map.get(name) ?? 0) + Number(row.inventory_count ?? 0));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Aquaculture harvest distribution — total harvested quantity per cultured
 * species. Only cycles with a recorded harvest quantity contribute, so
 * still-stocked or lost cycles do not distort the totals.
 */
export async function fetchAquacultureBySpecies(): Promise<NamedValue[]> {
  const { data, error } = await supabase
    .from("aquaculture_cycles")
    .select("species_name, harvest_qty");
  if (error) throw error;

  const map = new Map<string, number>();
  for (const row of (data ?? []) as { species_name: string; harvest_qty: number | null }[]) {
    if (row.harvest_qty == null) continue;
    const name = row.species_name?.trim() || "Unspecified";
    map.set(name, (map.get(name) ?? 0) + Number(row.harvest_qty ?? 0));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

/** Fish catch distribution — total quantity per municipal subsector. */
export async function fetchFishCatchBySubsector(): Promise<NamedValue[]> {
  const { data, error } = await supabase.from("fish_catch").select("subsector, quantity");
  if (error) throw error;

  const label = (s: string) =>
    s === "MARINE_MUNICIPAL" ? "Marine (municipal)" : "Inland (municipal)";
  const map = new Map<string, number>();
  for (const row of (data ?? []) as { subsector: string; quantity: number }[]) {
    const name = label(row.subsector);
    map.set(name, (map.get(name) ?? 0) + Number(row.quantity ?? 0));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

/** Crop production distribution — total harvested quantity per crop. */
export async function fetchYieldByCrop(): Promise<NamedValue[]> {
  const { data, error } = await supabase
    .from("harvest_inventory")
    .select("quantity_harvested, planting_records(crops(crop_name))");
  if (error) throw error;

  const map = new Map<string, number>();
  for (const row of (data ?? []) as unknown as HarvestJoin[]) {
    const name = row.planting_records?.crops?.crop_name ?? "Unknown";
    map.set(name, (map.get(name) ?? 0) + Number(row.quantity_harvested ?? 0));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

/** Barangay-level comparison — total area planted per barangay. */
export async function fetchAreaByBarangay(): Promise<NamedValue[]> {
  const { data, error } = await supabase
    .from("planting_records")
    .select("area_planted, farm_plots(farms(barangay))");
  if (error) throw error;

  const map = new Map<string, number>();
  for (const row of (data ?? []) as unknown as PlantingJoin[]) {
    const name = row.farm_plots?.farms?.barangay ?? "Unknown";
    map.set(name, (map.get(name) ?? 0) + Number(row.area_planted ?? 0));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

/** Crop yield trend by year (historical pattern, year-over-year). */
export async function fetchYieldTrend(): Promise<YieldTrendPoint[]> {
  const { data: harvests, error: hErr } = await supabase
    .from("harvest_inventory")
    .select("quantity_harvested, harvested_at");
  if (hErr) throw hErr;

  const { data: plantings, error: pErr } = await supabase
    .from("planting_records")
    .select("area_planted, planting_date");
  if (pErr) throw pErr;

  const yieldByYear = new Map<string, number>();
  for (const h of (harvests ?? []) as { quantity_harvested: number; harvested_at: string }[]) {
    const year = new Date(h.harvested_at).getFullYear().toString();
    yieldByYear.set(year, (yieldByYear.get(year) ?? 0) + Number(h.quantity_harvested ?? 0));
  }

  const areaByYear = new Map<string, number>();
  for (const p of (plantings ?? []) as { area_planted: number; planting_date: string }[]) {
    const year = new Date(p.planting_date).getFullYear().toString();
    areaByYear.set(year, (areaByYear.get(year) ?? 0) + Number(p.area_planted ?? 0));
  }

  const years = new Set<string>([...yieldByYear.keys(), ...areaByYear.keys()]);
  return [...years]
    .sort()
    .map((period) => ({
      period,
      yield: Math.round((yieldByYear.get(period) ?? 0) * 100) / 100,
      area: Math.round((areaByYear.get(period) ?? 0) * 100) / 100,
    }));
}

// ---------------------------------------------------------------------------
// Yield_Statistics (Data Dictionary Table 9): read stored summaries, and
// trigger server-side (Supabase Edge Function) computation that aggregates
// planting + harvest data by crop, barangay, and period, then persists it.
// ---------------------------------------------------------------------------

export async function fetchYieldStatistics(): Promise<YieldStatistic[]> {
  const { data, error } = await supabase
    .from("yield_statistics")
    .select("*, crops(crop_name)")
    .order("period_start", { ascending: false })
    .order("crop_id", { ascending: true });
  if (error) throw error;
  return (data as YieldStatistic[]) ?? [];
}

export async function fetchLivestockStatistics(): Promise<LivestockStatistic[]> {
  const { data, error } = await supabase
    .from("livestock_statistics")
    .select("*, livestock_species(species_name, category)")
    .order("period_start", { ascending: false })
    .order("species_id", { ascending: true });
  if (error) throw error;
  return (data as LivestockStatistic[]) ?? [];
}

export async function fetchFisheriesStatistics(): Promise<FisheriesStatistic[]> {
  const { data, error } = await supabase
    .from("fisheries_statistics")
    .select("*")
    .order("period_start", { ascending: false })
    .order("subsector", { ascending: true });
  if (error) throw error;
  return (data as FisheriesStatistic[]) ?? [];
}

export async function fetchAquacultureStatistics(): Promise<AquacultureStatistic[]> {
  const { data, error } = await supabase
    .from("aquaculture_statistics")
    .select("*")
    .order("period_start", { ascending: false })
    .order("species_name", { ascending: true });
  if (error) throw error;
  return (data as AquacultureStatistic[]) ?? [];
}

/**
 * Recomputes and stores statistical summaries for crops, livestock, and
 * fisheries for the given period type by invoking the `compute-statistics`
 * Supabase Edge Function, which runs the SQL aggregations server-side.
 * Returns the total number of statistic rows written across all sectors.
 */
export async function computeAndStoreYieldStatistics(periodType: PeriodType): Promise<number> {
  const { data, error } = await supabase.functions.invoke("compute-statistics", {
    body: { periodType },
  });
  if (error) throw error;
  return (data as { count: number }).count ?? 0;
}
