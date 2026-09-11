// AGRODATA - compute-statistics Edge Function
// Aggregates planting + harvest data by crop, barangay, and period server-side,
// then persists the summaries into public.yield_statistics (Data Dictionary
// Table 9). Existing rows of the same period type are replaced.
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { AuthorizationError, createUserClient, requireAdmin } from "../_shared/client.ts";

type PeriodType = "MONTHLY" | "QUARTERLY" | "YEARLY";

const PERIOD_TYPES: readonly PeriodType[] = ["MONTHLY", "QUARTERLY", "YEARLY"];

/** Raised for malformed/invalid request input; surfaced to the caller as 400. */
class BadRequestError extends Error {}

/** Parses the request body and validates the requested period type. */
async function parsePeriodType(req: Request): Promise<PeriodType> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON.");
  }
  const periodType = (body as { periodType?: unknown } | null)?.periodType;
  if (typeof periodType !== "string" || !PERIOD_TYPES.includes(periodType as PeriodType)) {
    throw new BadRequestError(
      `"periodType" is required and must be one of: ${PERIOD_TYPES.join(", ")}.`
    );
  }
  return periodType as PeriodType;
}

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

type StatRow = Record<string, unknown>;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createUserClient(req);
    // Recomputing statistics replaces stored summary rows for the whole
    // municipality, so restrict it to the Municipal Agriculturalist.
    await requireAdmin(supabase);

    const periodType = await parsePeriodType(req);

    // Aggregate every sector first, then hand all rows to a single database
    // function that deletes + re-inserts them in one transaction. This makes
    // recompute atomic: a failure can no longer leave summaries partially
    // wiped, unlike the previous per-sector delete/insert.
    const [yieldRows, livestockRows, fisheriesRows, aquacultureRows] = await Promise.all([
      buildCrops(supabase, periodType),
      buildLivestock(supabase, periodType),
      buildFisheries(supabase, periodType),
      buildAquaculture(supabase, periodType),
    ]);

    const { data, error } = await supabase.rpc("apply_sector_statistics", {
      p_period_type: periodType,
      p_yield: yieldRows,
      p_livestock: livestockRows,
      p_fisheries: fisheriesRows,
      p_aquaculture: aquacultureRows,
    });
    if (error) throw error;

    const counts = (data ?? {}) as {
      crops?: number;
      livestock?: number;
      fisheries?: number;
      aquaculture?: number;
    };
    const count =
      (counts.crops ?? 0) +
      (counts.livestock ?? 0) +
      (counts.fisheries ?? 0) +
      (counts.aquaculture ?? 0);

    return jsonResponse({ count, ...counts });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return jsonResponse({ error: err.message }, err.status);
    }
    if (err instanceof BadRequestError) {
      return jsonResponse({ error: err.message }, 400);
    }
    const message = err instanceof Error ? err.message : "Statistics computation failed";
    return jsonResponse({ error: message }, 400);
  }
});

// ---------- Crops (yield_statistics) ----------------------------------------
async function buildCrops(supabase: Client, periodType: PeriodType): Promise<StatRow[]> {
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

  return rows;
}

// ---------- Livestock & Poultry (livestock_statistics) ----------------------
interface LivestockRow {
  record_date: string;
  farmer_id: number;
  species_id: number;
  barangay: string | null;
  inventory_count: number;
  births: number;
  deaths: number;
  disposed: number;
  production_qty: number | null;
}

async function buildLivestock(supabase: Client, periodType: PeriodType): Promise<StatRow[]> {
  const { data, error } = await supabase
    .from("livestock_records")
    .select(
      "record_date, farmer_id, species_id, barangay, inventory_count, births, deaths, disposed, production_qty"
    );
  if (error) throw error;

  interface Agg {
    species_id: number;
    barangay: string | null;
    period_start: string;
    period_end: string;
    births: number;
    deaths: number;
    disposed: number;
    production: number;
    // Inventory is a stock, not a flow: keep the latest snapshot per holding
    // (producer) within the period so the same animals are not counted twice.
    latestByFarmer: Map<number, { date: string; inventory: number }>;
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
        births: 0,
        deaths: 0,
        disposed: 0,
        production: 0,
        latestByFarmer: new Map<number, { date: string; inventory: number }>(),
      } as Agg);
    agg.births += Number(r.births ?? 0);
    agg.deaths += Number(r.deaths ?? 0);
    agg.disposed += Number(r.disposed ?? 0);
    agg.production += Number(r.production_qty ?? 0);
    const prev = agg.latestByFarmer.get(r.farmer_id);
    if (!prev || r.record_date > prev.date) {
      agg.latestByFarmer.set(r.farmer_id, {
        date: r.record_date,
        inventory: Number(r.inventory_count ?? 0),
      });
    }
    map.set(key, agg);
  }

  const rows = [...map.values()].map((a) => ({
    species_id: a.species_id,
    barangay: a.barangay,
    period_type: periodType,
    period_start: a.period_start,
    period_end: a.period_end,
    total_inventory: [...a.latestByFarmer.values()].reduce((sum, v) => sum + v.inventory, 0),
    total_births: a.births,
    total_deaths: a.deaths,
    total_disposed: a.disposed,
    total_production: round(a.production),
  }));

  return rows;
}

// ---------- Fisheries (fisheries_statistics) --------------------------------
interface CatchRow {
  catch_date: string;
  subsector: string;
  species_name: string;
  quantity: number;
  unit: string | null;
}

async function buildFisheries(supabase: Client, periodType: PeriodType): Promise<StatRow[]> {
  const { data, error } = await supabase
    .from("fish_catch")
    .select("catch_date, subsector, species_name, quantity, unit");
  if (error) throw error;

  interface Agg {
    subsector: string;
    species_name: string;
    unit: string;
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
    // Group by unit so catch recorded in different units (kg, pieces, …) is
    // never combined into a single meaningless total.
    const unit = (r.unit ?? "").trim() || "kg";
    const key = `${r.subsector}|${r.species_name}|${unit}|${start}`;
    const agg =
      map.get(key) ??
      ({
        subsector: r.subsector,
        species_name: r.species_name,
        unit,
        period_start: start,
        period_end: end,
        catch: 0,
        records: 0,
      } as Agg);
    agg.catch += Number(r.quantity ?? 0);
    agg.records += 1;
    map.set(key, agg);
  }

  return [...map.values()].map((a) => ({
    subsector: a.subsector,
    species_name: a.species_name,
    unit: a.unit,
    period_type: periodType,
    period_start: a.period_start,
    period_end: a.period_end,
    total_catch: round(a.catch),
    catch_records: a.records,
  }));
}

// ---------- Aquaculture (aquaculture_statistics) ----------------------------
interface AquaCycleRow {
  species_name: string;
  unit: string | null;
  status: string;
  stocking_date: string;
  stocking_qty: number | null;
  harvest_qty: number | null;
  aquaculture_sites: { site_type: string | null } | null;
}

/**
 * Summarises culture cycles by cultured species, site type, unit, and period.
 * Cycles are bucketed by their stocking-date period (a stocking cohort).
 * Quantities are grouped by unit so incompatible units are never summed, and
 * cycle counts are split by status (active/harvested/lost).
 */
async function buildAquaculture(supabase: Client, periodType: PeriodType): Promise<StatRow[]> {
  const { data, error } = await supabase
    .from("aquaculture_cycles")
    .select(
      "species_name, unit, status, stocking_date, stocking_qty, harvest_qty, aquaculture_sites(site_type)"
    );
  if (error) throw error;

  interface Agg {
    species_name: string;
    site_type: string | null;
    unit: string;
    period_start: string;
    period_end: string;
    stocked: number;
    harvested: number;
    active: number;
    harvestedCycles: number;
    lost: number;
  }

  const map = new Map<string, Agg>();
  for (const r of (data ?? []) as unknown as AquaCycleRow[]) {
    const d = new Date(r.stocking_date);
    if (Number.isNaN(d.getTime())) continue;
    const { start, end } = periodBounds(d, periodType);
    const siteType = r.aquaculture_sites?.site_type ?? null;
    const unit = (r.unit ?? "").trim() || "kg";
    const species = (r.species_name ?? "").trim() || "Unspecified";
    const key = `${species}|${siteType ?? ""}|${unit}|${start}`;
    const agg =
      map.get(key) ??
      ({
        species_name: species,
        site_type: siteType,
        unit,
        period_start: start,
        period_end: end,
        stocked: 0,
        harvested: 0,
        active: 0,
        harvestedCycles: 0,
        lost: 0,
      } as Agg);
    agg.stocked += Number(r.stocking_qty ?? 0);
    agg.harvested += Number(r.harvest_qty ?? 0);
    if (r.status === "HARVESTED") agg.harvestedCycles += 1;
    else if (r.status === "LOST") agg.lost += 1;
    else agg.active += 1;
    map.set(key, agg);
  }

  const rows = [...map.values()].map((a) => ({
    species_name: a.species_name,
    site_type: a.site_type,
    unit: a.unit,
    period_type: periodType,
    period_start: a.period_start,
    period_end: a.period_end,
    total_stocked: round(a.stocked),
    total_harvested: round(a.harvested),
    active_cycles: a.active,
    harvested_cycles: a.harvestedCycles,
    lost_cycles: a.lost,
  }));

  return rows;
}
