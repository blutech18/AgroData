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
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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

const reportTypes: {
  value: ReportType;
  label: string;
  desc: string;
  icon: LucideIcon;
}[] = [
  {
    value: "crop_production",
    label: "Crop Production Report",
    desc: "Total area, yield, and average yield per crop.",
    icon: Sprout,
  },
  {
    value: "barangay_summary",
    label: "Barangay Production Summary",
    desc: "Production aggregated by barangay (PAO compliance).",
    icon: MapPin,
  },
  {
    value: "farmer_registry",
    label: "Farmer Registry",
    desc: "Complete list of registered farmers.",
    icon: Users,
  },
];

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
  const [type, setType] = React.useState<ReportType>("crop_production");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [report, setReport] = React.useState<ReportResult | null>(null);

  const genMutation = useMutation({
    mutationFn: () => generateReport(type, from || undefined, to || undefined),
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
  const usesDateRange = type !== "farmer_registry";

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

            {usesDateRange && (
              <div>
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  2 · Date range <span className="font-normal normal-case">· optional</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      From
                    </span>
                    <Input
                      id="from"
                      type="date"
                      aria-label="From date"
                      className="pl-12"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      To
                    </span>
                    <Input
                      id="to"
                      type="date"
                      aria-label="To date"
                      className="pl-12"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Leave blank to include all records.
                </p>
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
