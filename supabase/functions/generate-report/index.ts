// AGRODATA - generate-report Edge Function
// Executes SQL queries + aggregations server-side and returns a compiled,
// formatted Provincial Agriculture Office compliance report.
//
// Report types:
//   quarterly_crop_production | seasonal_farm_inventory
//   annual_municipal_summary  | farmer_registry
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { AuthorizationError, createUserClient, requireAdmin } from "../_shared/client.ts";

type ReportType =
  | "quarterly_crop_production"
  | "seasonal_farm_inventory"
  | "annual_municipal_summary"
  | "livestock_inventory"
  | "fisheries_catch"
  | "aquaculture_summary"
  | "farmer_registry";

const REPORT_TYPES: readonly ReportType[] = [
  "quarterly_crop_production",
  "seasonal_farm_inventory",
  "annual_municipal_summary",
  "livestock_inventory",
  "fisheries_catch",
  "aquaculture_summary",
  "farmer_registry",
];

/** Raised for malformed/invalid request input; surfaced to the caller as 400. */
class BadRequestError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new BadRequestError(`"${field}" must be a valid YYYY-MM-DD date.`);
  }
  return value;
}

/** Parses and validates the report request body. */
async function parseReportRequest(
  req: Request
): Promise<{ type: ReportType; from?: string; to?: string }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON.");
  }
  const raw = (body ?? {}) as { type?: unknown; from?: unknown; to?: unknown };
  if (typeof raw.type !== "string" || !REPORT_TYPES.includes(raw.type as ReportType)) {
    throw new BadRequestError(
      `"type" is required and must be one of: ${REPORT_TYPES.join(", ")}.`
    );
  }
  const from = validateDate(raw.from, "from");
  const to = validateDate(raw.to, "to");
  if (from && to && from > to) {
    throw new BadRequestError('"from" must not be later than "to".');
  }
  return { type: raw.type as ReportType, from, to };
}

interface ReportColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

interface ReportResult {
  title: string;
  subtitle: string;
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  generatedAt: string;
}

interface HarvestRow {
  quantity_harvested: number;
  harvested_at: string;
  planting_records: {
    area_planted: number;
    crops: { crop_name: string; crop_category: string | null } | null;
    farm_plots: { farms: { barangay: string } | null } | null;
  } | null;
}

const round = (n: number) => Math.round(n * 100) / 100;

function withinRange(dateStr: string, from?: string, to?: string) {
  const d = dateStr.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function periodLabel(from?: string, to?: string) {
  return from || to
    ? `Period: ${from || "start"} to ${to || "present"}`
    : "Period: All records";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createUserClient(req);
    // Reporting is an oversight function: enforce the role here, not only in
    // the browser router, so the endpoint cannot be called directly by staff.
    await requireAdmin(supabase);

    const { type, from, to } = await parseReportRequest(req);

    const generatedAt = new Date().toISOString();
    const period = periodLabel(from, to);

    if (type === "farmer_registry") {
      const { data, error } = await supabase
        .from("farmers")
        .select("first_name, last_name, sex, barangay, contact_no, registration_date")
        .order("barangay");
      if (error) throw error;
      const result: ReportResult = {
        title: "Registered Farmers Registry",
        subtitle: "OMA Kinoguitan · Farmer profiling report",
        columns: [
          { key: "name", label: "Farmer Name" },
          { key: "sex", label: "Sex" },
          { key: "barangay", label: "Barangay" },
          { key: "contact_no", label: "Contact No." },
          { key: "registered", label: "Registered" },
        ],
        rows: (data ?? []).map((f: Record<string, string>) => ({
          name: `${f.last_name}, ${f.first_name}`,
          sex: f.sex,
          barangay: f.barangay,
          contact_no: f.contact_no,
          registered: String(f.registration_date).slice(0, 10),
        })),
        generatedAt,
      };
      return jsonResponse(result);
    }

    if (type === "seasonal_farm_inventory") {
      return jsonResponse(await seasonalFarmInventory(supabase, generatedAt, period, from, to));
    }

    if (type === "livestock_inventory") {
      return jsonResponse(await livestockInventory(supabase, generatedAt, period, from, to));
    }

    if (type === "fisheries_catch") {
      return jsonResponse(await fisheriesCatch(supabase, generatedAt, period, from, to));
    }

    if (type === "aquaculture_summary") {
      return jsonResponse(await aquacultureSummary(supabase, generatedAt, period, from, to));
    }

    // quarterly_crop_production + annual_municipal_summary aggregate harvest data.
    const { data, error } = await supabase
      .from("harvest_inventory")
      .select(
        "quantity_harvested, harvested_at, planting_records(area_planted, crops(crop_name, crop_category), farm_plots(farms(barangay)))"
      );
    if (error) throw error;

    const rowsRaw = ((data ?? []) as unknown as HarvestRow[]).filter((r) =>
      withinRange(r.harvested_at, from, to)
    );

    if (type === "quarterly_crop_production") {
      const map = new Map<string, { barangay: string; crop: string; yield: number; area: number }>();
      for (const r of rowsRaw) {
        const barangay = r.planting_records?.farm_plots?.farms?.barangay ?? "Unknown";
        const crop = r.planting_records?.crops?.crop_name ?? "Unknown";
        const key = `${barangay}|${crop}`;
        const cur = map.get(key) ?? { barangay, crop, yield: 0, area: 0 };
        cur.yield += Number(r.quantity_harvested ?? 0);
        cur.area += Number(r.planting_records?.area_planted ?? 0);
        map.set(key, cur);
      }
      const result: ReportResult = {
        title: "Quarterly Crop Production Report",
        subtitle: `OMA Kinoguitan · ${period}`,
        columns: [
          { key: "barangay", label: "Barangay" },
          { key: "crop", label: "Crop" },
          { key: "area", label: "Area Planted (ha)", numeric: true },
          { key: "yield", label: "Total Yield", numeric: true },
          { key: "avg", label: "Avg Yield/ha", numeric: true },
        ],
        rows: [...map.values()]
          .map((v) => ({
            barangay: v.barangay,
            crop: v.crop,
            area: round(v.area),
            yield: round(v.yield),
            avg: v.area > 0 ? round(v.yield / v.area) : 0,
          }))
          .sort(
            (a, b) =>
              String(a.barangay).localeCompare(String(b.barangay)) ||
              (b.yield as number) - (a.yield as number)
          ),
        generatedAt,
      };
      return jsonResponse(result);
    }

    // annual_municipal_summary — consolidated per crop category + crop.
    const map = new Map<string, { crop: string; category: string; yield: number; area: number }>();
    for (const r of rowsRaw) {
      const crop = r.planting_records?.crops?.crop_name ?? "Unknown";
      const category = r.planting_records?.crops?.crop_category ?? "Uncategorized";
      const cur = map.get(crop) ?? { crop, category, yield: 0, area: 0 };
      cur.yield += Number(r.quantity_harvested ?? 0);
      cur.area += Number(r.planting_records?.area_planted ?? 0);
      map.set(crop, cur);
    }
    const result: ReportResult = {
      title: "Annual Municipal Agriculture Summary",
      subtitle: `OMA Kinoguitan · ${period}`,
      columns: [
        { key: "category", label: "Category" },
        { key: "crop", label: "Crop" },
        { key: "area", label: "Total Area (ha)", numeric: true },
        { key: "yield", label: "Total Yield", numeric: true },
        { key: "avg", label: "Avg Yield/ha", numeric: true },
      ],
      rows: [...map.values()]
        .map((v) => ({
          category: v.category,
          crop: v.crop,
          area: round(v.area),
          yield: round(v.yield),
          avg: v.area > 0 ? round(v.yield / v.area) : 0,
        }))
        .sort(
          (a, b) =>
            String(a.category).localeCompare(String(b.category)) ||
            (b.yield as number) - (a.yield as number)
        ),
      generatedAt,
    };
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return jsonResponse({ error: err.message }, err.status);
    }
    if (err instanceof BadRequestError) {
      return jsonResponse({ error: err.message }, 400);
    }
    const message = err instanceof Error ? err.message : "Report generation failed";
    return jsonResponse({ error: message }, 400);
  }
});

interface FarmInventoryRow {
  farm_id: number;
  farm_name: string;
  barangay: string;
  total_area: number | null;
  soil_type: string | null;
  irrigation_type: string | null;
  farmers: { first_name: string; last_name: string } | null;
}

// deno-lint-ignore no-explicit-any
async function seasonalFarmInventory(
  supabase: any,
  generatedAt: string,
  period: string,
  from?: string,
  to?: string
): Promise<ReportResult> {
  const { data: farms, error: farmErr } = await supabase
    .from("farms")
    .select(
      "farm_id, farm_name, barangay, total_area, soil_type, irrigation_type, farmers(first_name, last_name)"
    )
    .order("barangay");
  if (farmErr) throw farmErr;

  const { data: plots, error: plotErr } = await supabase.from("farm_plots").select("farm_id");
  if (plotErr) throw plotErr;
  const plotCount = new Map<number, number>();
  for (const p of (plots ?? []) as { farm_id: number }[]) {
    plotCount.set(p.farm_id, (plotCount.get(p.farm_id) ?? 0) + 1);
  }

  const { data: plantings, error: plantErr } = await supabase
    .from("planting_records")
    .select("planting_date, farm_plots(farm_id)");
  if (plantErr) throw plantErr;
  const plantingCount = new Map<number, number>();
  for (const pr of (plantings ?? []) as unknown as {
    planting_date: string;
    farm_plots: { farm_id: number } | null;
  }[]) {
    if (!withinRange(pr.planting_date, from, to)) continue;
    const fid = pr.farm_plots?.farm_id;
    if (fid == null) continue;
    plantingCount.set(fid, (plantingCount.get(fid) ?? 0) + 1);
  }

  return {
    title: "Seasonal Farm Inventory Report",
    subtitle: `OMA Kinoguitan · ${period}`,
    columns: [
      { key: "farm", label: "Farm" },
      { key: "owner", label: "Farmer" },
      { key: "barangay", label: "Barangay" },
      { key: "area", label: "Total Area (ha)", numeric: true },
      { key: "soil", label: "Soil Type" },
      { key: "irrigation", label: "Irrigation" },
      { key: "plots", label: "Plots", numeric: true },
      { key: "plantings", label: "Plantings (season)", numeric: true },
    ],
    rows: ((farms ?? []) as unknown as FarmInventoryRow[]).map((f) => ({
      farm: f.farm_name,
      owner: f.farmers ? `${f.farmers.last_name}, ${f.farmers.first_name}` : "—",
      barangay: f.barangay,
      area: f.total_area != null ? round(Number(f.total_area)) : 0,
      soil: f.soil_type ?? "—",
      irrigation: f.irrigation_type ?? "—",
      plots: plotCount.get(f.farm_id) ?? 0,
      plantings: plantingCount.get(f.farm_id) ?? 0,
    })),
    generatedAt,
  };
}

interface LivestockRow {
  record_date: string;
  farmer_id: number;
  barangay: string | null;
  inventory_count: number;
  births: number;
  deaths: number;
  disposed: number;
  production_qty: number | null;
  production_unit: string | null;
  livestock_species: { species_name: string; category: string } | null;
}

/**
 * Renders a unit-keyed production map as a human-readable breakdown, e.g.
 * "1,250 kg; 40 trays". Summing quantities across different units would be
 * meaningless, so each unit is totalled and reported separately.
 */
function formatProduction(byUnit: Map<string, number>): string {
  const parts = [...byUnit.entries()]
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([unit, qty]) => `${round(qty).toLocaleString("en-US")} ${unit}`);
  return parts.length > 0 ? parts.join("; ") : "—";
}

// deno-lint-ignore no-explicit-any
async function livestockInventory(
  supabase: any,
  generatedAt: string,
  period: string,
  from?: string,
  to?: string
): Promise<ReportResult> {
  const { data, error } = await supabase
    .from("livestock_records")
    .select(
      "record_date, farmer_id, barangay, inventory_count, births, deaths, disposed, production_qty, production_unit, livestock_species(species_name, category)"
    );
  if (error) throw error;

  const rows = ((data ?? []) as unknown as LivestockRow[]).filter((r) =>
    withinRange(r.record_date, from, to)
  );

  interface Agg {
    category: string;
    species: string;
    births: number;
    deaths: number;
    disposed: number;
    // Production is unit-sensitive; keep a per-unit total instead of one sum.
    productionByUnit: Map<string, number>;
    // Inventory is a stock; keep the latest snapshot per holding (producer +
    // barangay) within range so repeated snapshots are not double-counted.
    latestByHolding: Map<string, { date: string; inventory: number }>;
  }
  const map = new Map<string, Agg>();
  for (const r of rows) {
    const species = r.livestock_species?.species_name ?? "Unknown";
    const category = r.livestock_species?.category ?? "—";
    const cur =
      map.get(species) ??
      {
        category,
        species,
        births: 0,
        deaths: 0,
        disposed: 0,
        productionByUnit: new Map<string, number>(),
        latestByHolding: new Map<string, { date: string; inventory: number }>(),
      };
    cur.births += Number(r.births ?? 0);
    cur.deaths += Number(r.deaths ?? 0);
    cur.disposed += Number(r.disposed ?? 0);
    const qty = Number(r.production_qty ?? 0);
    if (qty > 0) {
      const unit = (r.production_unit ?? "").trim() || "unit";
      cur.productionByUnit.set(unit, (cur.productionByUnit.get(unit) ?? 0) + qty);
    }
    const holdingKey = `${r.farmer_id}|${r.barangay ?? ""}`;
    const prev = cur.latestByHolding.get(holdingKey);
    if (!prev || r.record_date > prev.date) {
      cur.latestByHolding.set(holdingKey, {
        date: r.record_date,
        inventory: Number(r.inventory_count ?? 0),
      });
    }
    map.set(species, cur);
  }

  return {
    title: "Livestock and Poultry Inventory Report",
    subtitle: `OMA Kinoguitan · ${period}`,
    columns: [
      { key: "category", label: "Category" },
      { key: "species", label: "Species" },
      { key: "inventory", label: "Inventory (current)", numeric: true },
      { key: "births", label: "Births", numeric: true },
      { key: "deaths", label: "Deaths", numeric: true },
      { key: "disposed", label: "Disposed", numeric: true },
      { key: "production", label: "Production" },
    ],
    rows: [...map.values()]
      .map((a) => ({
        category: a.category,
        species: a.species,
        inventory: [...a.latestByHolding.values()].reduce((sum, v) => sum + v.inventory, 0),
        births: a.births,
        deaths: a.deaths,
        disposed: a.disposed,
        production: formatProduction(a.productionByUnit),
      }))
      .sort(
        (a, b) =>
          String(a.category).localeCompare(String(b.category)) ||
          String(a.species).localeCompare(String(b.species))
      ),
    generatedAt,
  };
}

interface CatchRow {
  catch_date: string;
  subsector: string;
  species_name: string;
  quantity: number;
  unit: string;
}

// deno-lint-ignore no-explicit-any
async function fisheriesCatch(
  supabase: any,
  generatedAt: string,
  period: string,
  from?: string,
  to?: string
): Promise<ReportResult> {
  const { data, error } = await supabase
    .from("fish_catch")
    .select("catch_date, subsector, species_name, quantity, unit");
  if (error) throw error;

  const rows = ((data ?? []) as unknown as CatchRow[]).filter((r) =>
    withinRange(r.catch_date, from, to)
  );

  const label = (s: string) =>
    s === "MARINE_MUNICIPAL" ? "Marine (municipal)" : "Inland (municipal)";

  // Key by unit as well as subsector + species: catch recorded in different
  // units (e.g. kg vs. pieces) must not be summed into one meaningless total.
  const map = new Map<string, { subsector: string; species: string; quantity: number; unit: string }>();
  for (const r of rows) {
    const unit = (r.unit ?? "").trim() || "kg";
    const key = `${r.subsector}|${r.species_name}|${unit}`;
    const cur =
      map.get(key) ??
      { subsector: label(r.subsector), species: r.species_name, quantity: 0, unit };
    cur.quantity += Number(r.quantity ?? 0);
    map.set(key, cur);
  }

  return {
    title: "Municipal Fisheries Catch Report",
    subtitle: `OMA Kinoguitan · ${period}`,
    columns: [
      { key: "subsector", label: "Subsector" },
      { key: "species", label: "Species" },
      { key: "quantity", label: "Total Catch", numeric: true },
      { key: "unit", label: "Unit" },
    ],
    rows: [...map.values()]
      .map((v) => ({
        subsector: v.subsector,
        species: v.species,
        quantity: round(v.quantity),
        unit: v.unit,
      }))
      .sort(
        (a, b) =>
          String(a.subsector).localeCompare(String(b.subsector)) ||
          (b.quantity as number) - (a.quantity as number)
      ),
    generatedAt,
  };
}

interface AquaSummaryRow {
  species_name: string;
  unit: string | null;
  status: string;
  stocking_date: string;
  stocking_qty: number | null;
  harvest_qty: number | null;
  aquaculture_sites: { site_type: string | null } | null;
}

// deno-lint-ignore no-explicit-any
async function aquacultureSummary(
  supabase: any,
  generatedAt: string,
  period: string,
  from?: string,
  to?: string
): Promise<ReportResult> {
  const { data, error } = await supabase
    .from("aquaculture_cycles")
    .select(
      "species_name, unit, status, stocking_date, stocking_qty, harvest_qty, aquaculture_sites(site_type)"
    );
  if (error) throw error;

  // Filter by stocking-date period (cycles are reported by stocking cohort).
  const rows = ((data ?? []) as unknown as AquaSummaryRow[]).filter((r) =>
    withinRange(r.stocking_date, from, to)
  );

  interface Agg {
    siteType: string;
    species: string;
    unit: string;
    stocked: number;
    harvested: number;
    active: number;
    harvestedCycles: number;
    lost: number;
  }
  // Group by site type + species + unit so quantities in different units are
  // never merged into one figure.
  const map = new Map<string, Agg>();
  for (const r of rows) {
    const siteType = r.aquaculture_sites?.site_type ?? "—";
    const species = (r.species_name ?? "").trim() || "Unspecified";
    const unit = (r.unit ?? "").trim() || "kg";
    const key = `${siteType}|${species}|${unit}`;
    const cur =
      map.get(key) ??
      { siteType, species, unit, stocked: 0, harvested: 0, active: 0, harvestedCycles: 0, lost: 0 };
    cur.stocked += Number(r.stocking_qty ?? 0);
    cur.harvested += Number(r.harvest_qty ?? 0);
    if (r.status === "HARVESTED") cur.harvestedCycles += 1;
    else if (r.status === "LOST") cur.lost += 1;
    else cur.active += 1;
    map.set(key, cur);
  }

  return {
    title: "Aquaculture Stocking and Harvest Summary",
    subtitle: `OMA Kinoguitan · ${period}`,
    columns: [
      { key: "siteType", label: "Site Type" },
      { key: "species", label: "Species" },
      { key: "stocked", label: "Total Stocked", numeric: true },
      { key: "harvested", label: "Total Harvested", numeric: true },
      { key: "unit", label: "Unit" },
      { key: "active", label: "Active", numeric: true },
      { key: "harvestedCycles", label: "Harvested", numeric: true },
      { key: "lost", label: "Lost", numeric: true },
    ],
    rows: [...map.values()]
      .map((v) => ({
        siteType: v.siteType,
        species: v.species,
        stocked: round(v.stocked),
        harvested: round(v.harvested),
        unit: v.unit,
        active: v.active,
        harvestedCycles: v.harvestedCycles,
        lost: v.lost,
      }))
      .sort(
        (a, b) =>
          String(a.siteType).localeCompare(String(b.siteType)) ||
          String(a.species).localeCompare(String(b.species))
      ),
    generatedAt,
  };
}
