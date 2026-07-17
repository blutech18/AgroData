import { supabase } from "@/lib/supabase";

export type ReportType =
  | "crop_production"
  | "barangay_summary"
  | "farmer_registry";

export interface ReportColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

export interface ReportResult {
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
    crops: { crop_name: string } | null;
    farm_plots: { farms: { barangay: string } | null } | null;
  } | null;
}

function withinRange(dateStr: string, from?: string, to?: string) {
  const d = dateStr.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

/**
 * Generates a Provincial Agriculture Office compliance-style report from
 * harvest and planting data. Aggregations are computed automatically.
 */
export async function generateReport(
  type: ReportType,
  from?: string,
  to?: string
): Promise<ReportResult> {
  const generatedAt = new Date().toISOString();
  const period =
    from || to ? `Period: ${from || "start"} to ${to || "present"}` : "Period: All records";

  if (type === "farmer_registry") {
    const { data, error } = await supabase
      .from("farmers")
      .select("first_name, last_name, sex, barangay, contact_no, registration_date")
      .order("barangay");
    if (error) throw error;
    return {
      title: "Registered Farmers Registry",
      subtitle: "OMA Kinoguitan · Farmer profiling report",
      columns: [
        { key: "name", label: "Farmer Name" },
        { key: "sex", label: "Sex" },
        { key: "barangay", label: "Barangay" },
        { key: "contact_no", label: "Contact No." },
        { key: "registered", label: "Registered" },
      ],
      rows: (data ?? []).map((f: any) => ({
        name: `${f.last_name}, ${f.first_name}`,
        sex: f.sex,
        barangay: f.barangay,
        contact_no: f.contact_no,
        registered: String(f.registration_date).slice(0, 10),
      })),
      generatedAt,
    };
  }

  // Pull harvest joined with planting/crop/barangay for production reports.
  const { data, error } = await supabase
    .from("harvest_inventory")
    .select(
      "quantity_harvested, harvested_at, planting_records(area_planted, crops(crop_name), farm_plots(farms(barangay)))"
    );
  if (error) throw error;

  const rowsRaw = ((data ?? []) as unknown as HarvestRow[]).filter((r) =>
    withinRange(r.harvested_at, from, to)
  );

  if (type === "barangay_summary") {
    const map = new Map<string, { yield: number; area: number }>();
    for (const r of rowsRaw) {
      const b = r.planting_records?.farm_plots?.farms?.barangay ?? "Unknown";
      const cur = map.get(b) ?? { yield: 0, area: 0 };
      cur.yield += Number(r.quantity_harvested ?? 0);
      cur.area += Number(r.planting_records?.area_planted ?? 0);
      map.set(b, cur);
    }
    return {
      title: "Barangay Production Summary",
      subtitle: `OMA Kinoguitan · ${period}`,
      columns: [
        { key: "barangay", label: "Barangay" },
        { key: "area", label: "Total Area (ha)", numeric: true },
        { key: "yield", label: "Total Yield", numeric: true },
        { key: "avg", label: "Avg Yield/ha", numeric: true },
      ],
      rows: [...map.entries()]
        .map(([barangay, v]) => ({
          barangay,
          area: round(v.area),
          yield: round(v.yield),
          avg: v.area > 0 ? round(v.yield / v.area) : 0,
        }))
        .sort((a, b) => (b.yield as number) - (a.yield as number)),
      generatedAt,
    };
  }

  // crop_production
  const map = new Map<string, { yield: number; area: number }>();
  for (const r of rowsRaw) {
    const c = r.planting_records?.crops?.crop_name ?? "Unknown";
    const cur = map.get(c) ?? { yield: 0, area: 0 };
    cur.yield += Number(r.quantity_harvested ?? 0);
    cur.area += Number(r.planting_records?.area_planted ?? 0);
    map.set(c, cur);
  }
  return {
    title: "Crop Production Report",
    subtitle: `OMA Kinoguitan · ${period}`,
    columns: [
      { key: "crop", label: "Crop" },
      { key: "area", label: "Total Area (ha)", numeric: true },
      { key: "yield", label: "Total Yield", numeric: true },
      { key: "avg", label: "Avg Yield/ha", numeric: true },
    ],
    rows: [...map.entries()]
      .map(([crop, v]) => ({
        crop,
        area: round(v.area),
        yield: round(v.yield),
        avg: v.area > 0 ? round(v.yield / v.area) : 0,
      }))
      .sort((a, b) => (b.yield as number) - (a.yield as number)),
    generatedAt,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function downloadReportCsv(report: ReportResult) {
  const header = report.columns.map((c) => `"${c.label}"`).join(",");
  const lines = report.rows.map((row) =>
    report.columns.map((c) => `"${row[c.key] ?? ""}"`).join(",")
  );
  const csv = [header, ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${fileBase(report)}.csv`);
}

function fileBase(report: ReportResult) {
  return `${report.title.replace(/\s+/g, "_")}_${report.generatedAt.slice(0, 10)}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Excel export using an Excel-compatible HTML table (.xls). Opens natively in
 * Microsoft Excel and LibreOffice with no third-party dependency.
 */
export function downloadReportExcel(report: ReportResult) {
  const headerCells = report.columns
    .map((c) => `<th style="background:#127a39;color:#fff;border:1px solid #999;">${escapeHtml(c.label)}</th>`)
    .join("");
  const bodyRows = report.rows
    .map(
      (row) =>
        `<tr>${report.columns
          .map(
            (c) =>
              `<td style="border:1px solid #ccc;${c.numeric ? "mso-number-format:'0.00';" : ""}">${escapeHtml(
                row[c.key]
              )}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8" /></head>
  <body>
    <h3>${escapeHtml(report.title)}</h3>
    <div>${escapeHtml(report.subtitle)}</div>
    <table border="1">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </body></html>`;

  const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel" });
  triggerDownload(blob, `${fileBase(report)}.xls`);
}

export interface Signatory {
  label: string;
  name?: string;
  role: string;
}

/** PDF export rendered with jsPDF + autoTable, in provincial-compliance format. */
export async function downloadReportPdf(report: ReportResult, signatories: Signatory[] = []) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const cx = pageWidth / 2;

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Republic of the Philippines", cx, 38, { align: "center" });
  doc.text("Province of Misamis Oriental · Municipality of Kinoguitan", cx, 52, { align: "center" });
  doc.setFontSize(11);
  doc.setTextColor(40);
  doc.text("Office of the Municipal Agriculturalist", cx, 68, { align: "center" });
  doc.setFontSize(15);
  doc.setTextColor(20);
  doc.text(report.title.toUpperCase(), cx, 90, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(report.subtitle, cx, 106, { align: "center" });

  autoTable(doc, {
    startY: 122,
    head: [report.columns.map((c) => c.label)],
    body: report.rows.map((row) => report.columns.map((c) => String(row[c.key] ?? ""))),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [18, 122, 57], halign: "center" },
    theme: "grid",
  });

  // Signatory blocks below the table (2-column grid).
  if (signatories.length > 0) {
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 140;
    const colX = [pageWidth * 0.28, pageWidth * 0.72];
    const rowHeight = 66;
    const startY = finalY + 50;
    doc.setFontSize(9);
    signatories.forEach((s, i) => {
      const x = colX[i % 2];
      const rowY = startY + Math.floor(i / 2) * rowHeight;
      doc.setTextColor(120);
      doc.text(s.label, x, rowY, { align: "center" });
      doc.setTextColor(20);
      doc.text((s.name || "").toUpperCase(), x, rowY + 30, { align: "center" });
      doc.setDrawColor(40);
      doc.line(x - 70, rowY + 34, x + 70, rowY + 34);
      doc.setTextColor(120);
      doc.text(s.role, x, rowY + 46, { align: "center" });
    });
  }

  doc.save(`${fileBase(report)}.pdf`);
}
