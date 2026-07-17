import { supabase } from "@/lib/supabase";
import type { PeriodType, YieldStatistic } from "@/types/database";

export interface DashboardSummary {
  farmerCount: number;
  farmCount: number;
  cropCount: number;
  activePlantings: number;
  totalAreaPlanted: number;
  totalYield: number;
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

export interface ForecastPoint {
  period: string;
  actual: number | null;
  forecast: number | null;
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

async function countRows(table: string, filter?: (q: any) => any): Promise<number> {
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

  const { data: plantings } = await supabase.from("planting_records").select("area_planted");
  const { data: harvests } = await supabase.from("harvest_inventory").select("quantity_harvested");

  const totalAreaPlanted = (plantings ?? []).reduce(
    (sum, p: { area_planted: number }) => sum + Number(p.area_planted ?? 0),
    0
  );
  const totalYield = (harvests ?? []).reduce(
    (sum, h: { quantity_harvested: number }) => sum + Number(h.quantity_harvested ?? 0),
    0
  );

  return { farmerCount, farmCount, cropCount, activePlantings, totalAreaPlanted, totalYield };
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

/**
 * Basic production forecast using linear regression (least squares) over the
 * historical yearly yield series. Projects the next `horizon` periods.
 * The manuscript scopes forecasting to historical data patterns only.
 */
export function buildForecast(trend: YieldTrendPoint[], horizon = 2): ForecastPoint[] {
  const points = trend.filter((t) => t.yield > 0);
  const result: ForecastPoint[] = trend.map((t) => ({
    period: t.period,
    actual: t.yield,
    forecast: null,
  }));

  if (points.length < 2) return result;

  // x = index, y = yield
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.yield);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumXX = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return result;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // Connect last actual point to the forecast line.
  const lastIdx = result.length - 1;
  result[lastIdx] = { ...result[lastIdx], forecast: result[lastIdx].actual };

  const lastYear = parseInt(points[points.length - 1].period, 10);
  for (let h = 1; h <= horizon; h++) {
    const x = n - 1 + h;
    const predicted = Math.max(0, slope * x + intercept);
    result.push({
      period: String(lastYear + h),
      actual: null,
      forecast: Math.round(predicted * 100) / 100,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Yield_Statistics (Data Dictionary Table 9): compute & persist statistical
// summaries from planting + harvest data, grouped by crop, barangay, period.
// ---------------------------------------------------------------------------

interface StatHarvestJoin {
  quantity_harvested: number;
  harvested_at: string;
  planting_records: {
    area_planted: number;
    crop_id: number;
    farm_plots: { farms: { barangay: string | null; farmer_id: number | null } | null } | null;
  } | null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function periodBounds(date: Date, type: PeriodType) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  if (type === "YEARLY") {
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  if (type === "QUARTERLY") {
    const startM = Math.floor(m / 3) * 3;
    const end = new Date(y, startM + 3, 0);
    return { start: `${y}-${pad(startM + 1)}-01`, end: `${y}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}` };
  }
  const end = new Date(y, m + 1, 0);
  return { start: `${y}-${pad(m + 1)}-01`, end: `${y}-${pad(m + 1)}-${pad(end.getDate())}` };
}

export async function fetchYieldStatistics(): Promise<YieldStatistic[]> {
  const { data, error } = await supabase
    .from("yield_statistics")
    .select("*, crops(crop_name)")
    .order("period_start", { ascending: false })
    .order("crop_id", { ascending: true });
  if (error) throw error;
  return (data as YieldStatistic[]) ?? [];
}

/**
 * Recomputes and stores Yield_Statistics for the given period type. Existing
 * rows of that period type are replaced so the table always reflects current data.
 * Returns the number of statistic rows written.
 */
export async function computeAndStoreYieldStatistics(periodType: PeriodType): Promise<number> {
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

  const round = (n: number) => Math.round(n * 100) / 100;
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

  // Replace existing rows of this period type.
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
