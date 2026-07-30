// AGRODATA - compute-statistics Edge Function
// Aggregates planting + harvest data by crop, barangay, and period server-side,
// then persists the summaries into public.yield_statistics (Data Dictionary
// Table 9). Existing rows of the same period type are replaced.
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/client.ts";

type PeriodType = "MONTHLY" | "QUARTERLY" | "YEARLY";

interface StatHarvestJoin {
  quantity_harvested: number;
  harvested_at: string;
  planting_records: {
    area_planted: number;
    crop_id: number;
    farm_plots: { farms: { barangay: string | null; farmer_id: number | null } | null } | null;
  } | null;
}

const round = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number) => String(n).padStart(2, "0");

function periodBounds(date: Date, type: PeriodType) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  if (type === "YEARLY") {
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  if (type === "QUARTERLY") {
    const startM = Math.floor(m / 3) * 3;
    const end = new Date(y, startM + 3, 0);
    return {
      start: `${y}-${pad(startM + 1)}-01`,
      end: `${y}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    };
  }
  const end = new Date(y, m + 1, 0);
  return { start: `${y}-${pad(m + 1)}-01`, end: `${y}-${pad(m + 1)}-${pad(end.getDate())}` };
}

// deno-lint-ignore no-explicit-any
type Client = any;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createUserClient(req);
    const { periodType } = (await req.json()) as { periodType: PeriodType };

    const crops = await computeCrops(supabase, periodType);
    const livestock = await computeLivestock(supabase, periodType);
    const fisheries = await computeFisheries(supabase, periodType);

    return jsonResponse({ count: crops + livestock + fisheries, crops, livestock, fisheries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Statistics computation failed";
    return jsonResponse({ error: message }, 400);
  }
});

// ---------- Crops (yield_statistics) ----------------------------------------
async function computeCrops(supabase: Client, periodType: PeriodType): Promise<number> {
  const { data, error } = await supabase
    .from("harvest_inventory")
    .select(
      "quantity_harvested, harvested_at, planting_records(area_planted, crop_id, farm_plots(farms(barangay, farmer_id)))"
    );
  if (error) throw error;

  interface Agg {
    crop_id: number;
    barangay: string | null;
    period_start: string;
    period_end: string;
    area: number;
    yield: number;
    farmers: Set<number>;
  }

  const map = new Map<string, Agg>();
  for (const row of (data ?? []) as unknown as StatHarvestJoin[]) {
    const pr = row.planting_records;
    if (!pr) continue;
    const d = new Date(row.harvested_at);
    if (Number.isNaN(d.getTime())) continue;
    const { start, end } = periodBounds(d, periodType);
    const barangay = pr.farm_plots?.farms?.barangay ?? null;
    const farmerId = pr.farm_plots?.farms?.farmer_id ?? null;
    const key = `${pr.crop_id}|${barangay ?? ""}|${start}`;
    const agg =
      map.get(key) ??
      ({
        crop_id: pr.crop_id,
        barangay,
        period_start: start,
        period_end: end,
        area: 0,
        yield: 0,
        farmers: new Set<number>(),
      } as Agg);
    agg.area += Number(pr.area_planted ?? 0);
    agg.yield += Number(row.quantity_harvested ?? 0);
    if (farmerId) agg.farmers.add(farmerId);
    map.set(key, agg);
  }

  const rows = [...map.values()].map((a) => ({
    crop_id: a.crop_id,
    barangay: a.barangay,
    period_type: periodType,
    period_start: a.period_start,
    period_end: a.period_end,
    total_area_planted: round(a.area),
    total_yield: round(a.yield),
    average_yield_per_hectare: a.area > 0 ? round(a.yield / a.area) : 0,
    farmer_count: a.farmers.size,
  }));

  const { error: delError } = await supabase
    .from("yield_statistics")
    .delete()
    .eq("period_type", periodType);
  if (delError) throw delError;
  if (rows.length > 0) {
    const { error: insError } = await supabase.from("yield_statistics").insert(rows);
    if (insError) throw insError;
  }
  return rows.length;
}

// ---------- Livestock & Poultry (livestock_statistics) ----------------------
interface LivestockRow {
  record_date: string;
  species_id: number;
  barangay: string | null;
  inventory_count: number;
  births: number;
  deaths: number;
  disposed: number;
  production_qty: number | null;
}

async function computeLivestock(supabase: Client, periodType: PeriodType): Promise<number> {
  const { data, error } = await supabase
    .from("livestock_records")
    .select(
      "record_date, species_id, barangay, inventory_count, births, deaths, disposed, production_qty"
    );
  if (error) throw error;

  interface Agg {
    species_id: number;
    barangay: string | null;
    period_start: string;
    period_end: string;
    inventory: number;
    births: number;
    deaths: number;
    disposed: number;
    production: number;
  }

  const map = new Map<string, Agg>();
  for (const r of (data ?? []) as unknown as LivestockRow[]) {
    const d = new Date(r.record_date);
    if (Number.isNaN(d.getTime())) continue;
    const { start, end } = periodBounds(d, periodType);
    const barangay = r.barangay ?? null;
    const key = `${r.species_id}|${barangay ?? ""}|${start}`;
    const agg =
      map.get(key) ??
      ({
        species_id: r.species_id,
        barangay,
        period_start: start,
        period_end: end,
        inventory: 0,
        births: 0,
        deaths: 0,
        disposed: 0,
        production: 0,
      } as Agg);
    agg.inventory += Number(r.inventory_count ?? 0);
    agg.births += Number(r.births ?? 0);
    agg.deaths += Number(r.deaths ?? 0);
    agg.disposed += Number(r.disposed ?? 0);
    agg.production += Number(r.production_qty ?? 0);
    map.set(key, agg);
  }

  const rows = [...map.values()].map((a) => ({
    species_id: a.species_id,
    barangay: a.barangay,
    period_type: periodType,
    period_start: a.period_start,
    period_end: a.period_end,
    total_inventory: a.inventory,
    total_births: a.births,
    total_deaths: a.deaths,
    total_disposed: a.disposed,
    total_production: round(a.production),
  }));

  const { error: delError } = await supabase
    .from("livestock_statistics")
    .delete()
    .eq("period_type", periodType);
  if (delError) throw delError;
  if (rows.length > 0) {
    const { error: insError } = await supabase.from("livestock_statistics").insert(rows);
    if (insError) throw insError;
  }
  return rows.length;
}

// ---------- Fisheries (fisheries_statistics) --------------------------------
interface CatchRow {
  catch_date: string;
  subsector: string;
  species_name: string;
  quantity: number;
}

async function computeFisheries(supabase: Client, periodType: PeriodType): Promise<number> {
  const { data, error } = await supabase
    .from("fish_catch")
    .select("catch_date, subsector, species_name, quantity");
  if (error) throw error;

  interface Agg {
    subsector: string;
    species_name: string;
    period_start: string;
    period_end: string;
    catch: number;
    records: number;
  }

  const map = new Map<string, Agg>();
  for (const r of (data ?? []) as unknown as CatchRow[]) {
    const d = new Date(r.catch_date);
    if (Number.isNaN(d.getTime())) continue;
    const { start, end } = periodBounds(d, periodType);
    const key = `${r.subsector}|${r.species_name}|${start}`;
    const agg =
      map.get(key) ??
      ({
        subsector: r.subsector,
        species_name: r.species_name,
        period_start: start,
        period_end: end,
        catch: 0,
        records: 0,
      } as Agg);
    agg.catch += Number(r.quantity ?? 0);
    agg.records += 1;
    map.set(key, agg);
  }

  const rows = [...map.values()].map((a) => ({
    subsector: a.subsector,
    species_name: a.species_name,
    period_type: periodType,
    period_start: a.period_start,
    period_end: a.period_end,
    total_catch: round(a.catch),
    catch_records: a.records,
  }));

  const { error: delError } = await supabase
    .from("fisheries_statistics")
    .delete()
    .eq("period_type", periodType);
  if (delError) throw delError;
  if (rows.length > 0) {
    const { error: insError } = await supabase.from("fisheries_statistics").insert(rows);
    if (insError) throw insError;
  }
  return rows.length;
}
