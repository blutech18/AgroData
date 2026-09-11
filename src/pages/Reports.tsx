import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Printer,
  Loader2,
  Sprout,
  MapPin,
  Users,
  FileSpreadsheet,
  FileType,
  Beef,
  Fish,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/states";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/audit";
import { cn, formatDate } from "@/lib/utils";
import {
  downloadReportCsv,
  downloadReportExcel,
  downloadReportPdf,
  generateReport,
  type ReportResult,
  type ReportType,
} from "@/features/reports";

type PeriodMode = "quarter" | "season" | "year" | "none";

const reportTypes: {
  value: ReportType;
  label: string;
  desc: string;
  icon: LucideIcon;
  period: PeriodMode;
}[] = [
  {
    value: "quarterly_crop_production",
    label: "Quarterly Crop Production Report",
    desc: "Crop types, area planted, and total yield per barangay for a quarter.",
    icon: Sprout,
    period: "quarter",
  },
  {
    value: "seasonal_farm_inventory",
    label: "Seasonal Farm Inventory Report",
    desc: "Registered farms, land classifications, and planting activities per season.",
    icon: MapPin,
    period: "season",
  },
  {
    value: "annual_municipal_summary",
    label: "Annual Municipal Agriculture Summary",
    desc: "Yearly crop production consolidated across all barangays and crop categories.",
    icon: FileSpreadsheet,
    period: "year",
  },
  {
    value: "livestock_inventory",
    label: "Livestock & Poultry Inventory Report",
    desc: "Inventory, births, deaths, dispositions, and production per species for a quarter.",
    icon: Beef,
    period: "quarter",
  },
  {
    value: "fisheries_catch",
    label: "Municipal Fisheries Catch Report",
    desc: "Total catch per species and subsector (marine/inland) for a quarter.",
    icon: Fish,
    period: "quarter",
  },
  {
    value: "aquaculture_summary",
    label: "Aquaculture Stocking & Harvest Summary",
    desc: "Stocked and harvested quantities per site type and species for a quarter.",
    icon: Waves,
    period: "quarter",
  },
  {
    value: "farmer_registry",
    label: "Farmer Registry",
    desc: "Complete list of registered farmers (farmer profiling).",
    icon: Users,
    period: "none",
  },
];

const QUARTER_RANGES: Record<string, [string, string]> = {
  "1": ["01-01", "03-31"],
  "2": ["04-01", "06-30"],
  "3": ["07-01", "09-30"],
  "4": ["10-01", "12-31"],
};

/**
 * Resolves the report's date range from the selected period controls.
 * Dry season spans Nov (selected year) to Apr (following year); wet season
 * spans May to Oct of the selected year.
 */
function resolveRange(
  period: PeriodMode,
  year: string,
  quarter: string,
  season: "WET" | "DRY"
): { from?: string; to?: string } {
  if (period === "year") return { from: `${year}-01-01`, to: `${year}-12-31` };
  if (period === "quarter") {
    const [start, end] = QUARTER_RANGES[quarter];
    return { from: `${year}-${start}`, to: `${year}-${end}` };
  }
  if (period === "season") {
    return season === "WET"
      ? { from: `${year}-05-01`, to: `${year}-10-31` }
      : { from: `${year}-11-01`, to: `${Number(year) + 1}-04-30` };
  }
  return {};
}

function Signatory({ label, name, role }: { label: string; name?: string; role: string }) {
  return (
    <div className="text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-8 border-t border-foreground pt-1 text-center font-semibold uppercase">
        {name || "\u00A0"}
      </p>
      <p className="text-center text-xs text-muted-foreground">{role}</p>
    </div>
  );
}

export default function ReportsPage() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const preparerName = profile ? `${profile.first_name} ${profile.last_name}` : "";
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => String(currentYear - i));
  const [type, setType] = React.useState<ReportType>("quarterly_crop_production");
  const [year, setYear] = React.useState(String(currentYear));
  const [quarter, setQuarter] = React.useState("1");
  const [season, setSeason] = React.useState<"WET" | "DRY">("WET");
  const [report, setReport] = React.useState<ReportResult | null>(null);

  const periodMode = reportTypes.find((r) => r.value === type)?.period ?? "none";

  const genMutation = useMutation({
    mutationFn: () => {
      const { from, to } = resolveRange(periodMode, year, quarter, season);
      return generateReport(type, from, to);
    },
    onSuccess: async (result) => {
      setReport(result);
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "GENERATE_REPORT",
        entity: "reports",
        details: result.title,
      });
    },
    onError: (err: unknown) =>
      toast({
        title: "Could not generate report",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      }),
  });

  const handlePrint = () => window.print();

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate automated compliance reports for the municipal and provincial agriculture offices."
      />

      <div className="grid gap-6 lg:grid-cols-[440px_minmax(0,1fr)] lg:items-start">
        {/* Options panel */}
        <Card className="print:hidden lg:sticky lg:top-4">
          <CardContent className="space-y-5 p-5">
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1 · Choose a report
              </Label>
              <div className="space-y-2">
                {reportTypes.map((r) => {
                  const selected = type === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setType(r.value)}
                      aria-pressed={selected}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-accent"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <r.icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-tight">{r.label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{r.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {periodMode !== "none" && (
              <div>
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  2 · Reporting period
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="year" className="text-xs font-normal text-muted-foreground">
                      Year
                    </Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger id="year" aria-label="Year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {periodMode === "quarter" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="quarter" className="text-xs font-normal text-muted-foreground">
                        Quarter
                      </Label>
                      <Select value={quarter} onValueChange={setQuarter}>
                        <SelectTrigger id="quarter" aria-label="Quarter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Q1 · Jan–Mar</SelectItem>
                          <SelectItem value="2">Q2 · Apr–Jun</SelectItem>
                          <SelectItem value="3">Q3 · Jul–Sep</SelectItem>
                          <SelectItem value="4">Q4 · Oct–Dec</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {periodMode === "season" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="season" className="text-xs font-normal text-muted-foreground">
                        Season
                      </Label>
                      <Select
                        value={season}
                        onValueChange={(v) => setSeason(v as "WET" | "DRY")}
                      >
                        <SelectTrigger id="season" aria-label="Season">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WET">Wet · May–Oct</SelectItem>
                          <SelectItem value="DRY">Dry · Nov–Apr</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={() => genMutation.mutate()}
              disabled={genMutation.isPending}
            >
              {genMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Generate report
            </Button>
          </CardContent>
        </Card>

        {/* Report preview */}
        <Card className="overflow-hidden">
          {!report ? (
            <EmptyState
              title="No report generated yet"
              description="Pick a report type on the left and click Generate to preview it here."
            />
          ) : (
            <div>
              {/* Toolbar */}
              <div className="flex flex-col gap-3 border-b bg-muted/40 p-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>
                    {report.rows.length} record{report.rows.length === 1 ? "" : "s"} · generated{" "}
                    {formatDate(report.generatedAt)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadReportPdf(report, [
                        { label: "Prepared by:", name: preparerName, role: profile?.user_roles?.role_name ?? "OMA Staff" },
                        { label: "Reviewed and validated by:", role: "Reviewing Officer" },
                        { label: "Approved by:", role: "Municipal Agriculturalist" },
                        { label: "Certified true and correct by:", role: "LGU Kinoguitan" },
                      ])
                    }
                    disabled={report.rows.length === 0}
                  >
                    <FileType className="h-4 w-4" /> PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadReportExcel(report)}
                    disabled={report.rows.length === 0}
                  >
                    <FileSpreadsheet className="h-4 w-4" /> Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadReportCsv(report)}
                    disabled={report.rows.length === 0}
                  >
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4" /> Print
                  </Button>
                </div>
              </div>

              {/* Printable content */}
              <div className="p-6" id="report-printable">
                <div className="mb-5 border-b pb-4 text-center">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Republic of the Philippines
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Province of Misamis Oriental · Municipality of Kinoguitan
                  </p>
                  <p className="text-sm font-semibold">
                    Office of the Municipal Agriculturalist
                  </p>
                  <h2 className="mt-3 text-xl font-bold uppercase">{report.title}</h2>
                  <p className="text-sm text-muted-foreground">{report.subtitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Date generated: {formatDate(report.generatedAt)}
                  </p>
                </div>

                {report.rows.length === 0 ? (
                  <EmptyState
                    title="No data for the selected criteria"
                    description="Try widening the date range or recording more data first."
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {report.columns.map((c) => (
                              <TableHead key={c.key}>{c.label}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.rows.map((row, i) => (
                            <TableRow key={i}>
                              {report.columns.map((c) => (
                                <TableCell key={c.key} className={c.numeric ? "tabular-nums" : ""}>
                                  {row[c.key] ?? "—"}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Signatory blocks (provincial compliance format) */}
                    <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2">
                      <Signatory
                        label="Prepared by:"
                        name={preparerName}
                        role={profile?.user_roles?.role_name ?? "OMA Staff"}
                      />
                      <Signatory label="Reviewed and validated by:" role="Reviewing Officer" />
                      <Signatory label="Approved by:" role="Municipal Agriculturalist" />
                      <Signatory label="Certified true and correct by:" role="LGU Kinoguitan" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
