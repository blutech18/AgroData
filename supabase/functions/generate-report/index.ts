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
  | "farmer_registry";

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

    const { type, from, to } = (await req.json()) as {
      type: ReportType;
      from?: string;
      to?: string;
    };

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
  inventory_count: number;
  births: number;
  deaths: number;
  disposed: number;
  production_qty: number | null;
  livestock_species: { species_name: string; category: string } | null;
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
      "record_date, inventory_count, births, deaths, disposed, production_qty, livestock_species(species_name, category)"
    );
  if (error) throw error;

  const rows = ((data ?? []) as unknown as LivestockRow[]).filter((r) =>
    withinRange(r.record_date, from, to)
  );

  interface Agg {
    category: string;
    species: string;
    inventory: number;
    births: number;
    deaths: number;
    disposed: number;
    production: number;
  }
  const map = new Map<string, Agg>();
  for (const r of rows) {
    const species = r.livestock_species?.species_name ?? "Unknown";
    const category = r.livestock_species?.category ?? "—";
    const cur =
      map.get(species) ??
      { category, species, inventory: 0, births: 0, deaths: 0, disposed: 0, production: 0 };
    cur.inventory += Number(r.inventory_count ?? 0);
    cur.births += Number(r.births ?? 0);
    cur.deaths += Number(r.deaths ?? 0);
    cur.disposed += Number(r.disposed ?? 0);
    cur.production += Number(r.production_qty ?? 0);
    map.set(species, cur);
  }

  return {
    title: "Livestock and Poultry Inventory Report",
    subtitle: `OMA Kinoguitan · ${period}`,
    columns: [
      { key: "category", label: "Category" },
      { key: "species", label: "Species" },
      { key: "inventory", label: "Inventory (recorded)", numeric: true },
      { key: "births", label: "Births", numeric: true },
      { key: "deaths", label: "Deaths", numeric: true },
      { key: "disposed", label: "Disposed", numeric: true },
      { key: "production", label: "Production", numeric: true },
    ],
    rows: [...map.values()]
      .map((a) => ({
        category: a.category,
        species: a.species,
        inventory: a.inventory,
        births: a.births,
        deaths: a.deaths,
        disposed: a.disposed,
        production: round(a.production),
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

  const map = new Map<string, { subsector: string; species: string; quantity: number; unit: string }>();
  for (const r of rows) {
    const key = `${r.subsector}|${r.species_name}`;
    const cur =
      map.get(key) ??
      { subsector: label(r.subsector), species: r.species_name, quantity: 0, unit: r.unit ?? "kg" };
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
