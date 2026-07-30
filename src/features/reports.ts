import { supabase } from "@/lib/supabase";

/**
 * Compliance report types required by the Provincial Agriculture Office
 * (see manuscript, Use Case: Generate Agricultural Produced Report):
 *   - quarterly_crop_production : crop types, area planted, and total yield
 *                                 per barangay for a given quarter.
 *   - seasonal_farm_inventory   : registered farms, land classifications, and
 *                                 planting activities per season.
 *   - annual_municipal_summary  : yearly production consolidated across all
 *                                 barangays and crop categories.
 * farmer_registry supports Objective 1 (report generation for farmer records).
 */
export type ReportType =
  | "quarterly_crop_production"
  | "seasonal_farm_inventory"
  | "annual_municipal_summary"
  | "livestock_inventory"
  | "fisheries_catch"
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

/**
 * Generates a Provincial Agriculture Office compliance report by invoking the
 * `generate-report` Supabase Edge Function. The Edge Function executes the SQL
 * queries and aggregations server-side and returns the compiled, formatted
 * result. Export helpers below then package it into PDF / Excel / CSV.
 */
export async function generateReport(
  type: ReportType,
  from?: string,
  to?: string
): Promise<ReportResult> {
  const { data, error } = await supabase.functions.invoke("generate-report", {
    body: { type, from, to },
  });
  if (error) throw error;
  return data as ReportResult;
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

export function downloadReportCsv(report: ReportResult) {
  const header = report.columns.map((c) => `"${c.label}"`).join(",");
  const lines = report.rows.map((row) =>
    report.columns.map((c) => `"${row[c.key] ?? ""}"`).join(",")
  );
  const csv = [header, ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${fileBase(report)}.csv`);
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
