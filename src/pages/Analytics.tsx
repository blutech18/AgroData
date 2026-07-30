import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calculator, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { LoadingState, EmptyState } from "@/components/shared/states";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/audit";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  computeAndStoreYieldStatistics,
  fetchFisheriesStatistics,
  fetchLivestockStatistics,
  fetchYieldStatistics,
  fetchYieldTrend,
} from "@/features/analytics";
import type { PeriodType } from "@/types/database";

export default function AnalyticsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile, isAdmin } = useAuth();
  const [periodType, setPeriodType] = React.useState<PeriodType>("YEARLY");

  const trend = useQuery({ queryKey: ["yield-trend"], queryFn: fetchYieldTrend });
  const stats = useQuery({ queryKey: ["yield-statistics"], queryFn: fetchYieldStatistics });
  const livestockStats = useQuery({
    queryKey: ["livestock-statistics"],
    queryFn: fetchLivestockStatistics,
  });
  const fisheriesStats = useQuery({
    queryKey: ["fisheries-statistics"],
    queryFn: fetchFisheriesStatistics,
  });

  const computeMutation = useMutation({
    mutationFn: () => computeAndStoreYieldStatistics(periodType),
    onSuccess: async (count) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "COMPUTE_STATISTICS",
        entity: "yield_statistics",
        details: `${periodType} · ${count} summaries (all sectors)`,
      });
      toast({
        title: "Statistics computed",
        description: `${count} ${periodType.toLowerCase()} summary record(s) stored across crops, livestock, and fisheries.`,
        variant: "success",
      });
      qc.invalidateQueries({ queryKey: ["yield-statistics"] });
      qc.invalidateQueries({ queryKey: ["livestock-statistics"] });
      qc.invalidateQueries({ queryKey: ["fisheries-statistics"] });
    },
    onError: (err: unknown) =>
      toast({
        title: "Could not compute statistics",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      }),
  });

  const hasData = (trend.data?.length ?? 0) >= 2;
  const statRows = stats.data ?? [];
  const livestockRows = livestockStats.data ?? [];
  const fisheriesRows = fisheriesStats.data ?? [];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Statistical summaries and historical crop yield trend analysis."
      />

      <div className="space-y-6">
        {trend.isLoading ? (
          <LoadingState label="Computing analytics…" />
        ) : !hasData ? (
          <Card>
            <EmptyState
              title="Not enough historical data"
              description="At least two years of harvest records are needed to compute yield trends."
            />
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Crop Yield Trend</CardTitle>
                <CardDescription>
                  Historical recorded yield per year, based on stored harvest records.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={trend.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => formatNumber(v, 2)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="yield"
                      name="Yield"
                      stroke="#1b9e4b"
                      strokeWidth={2.5}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Area Planted Over Time</CardTitle>
                <CardDescription>Total hectares planted per year.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trend.data}>
                    <defs>
                      <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1b9e4b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#1b9e4b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => `${formatNumber(v, 2)} ha`} />
                    <Area
                      type="monotone"
                      dataKey="area"
                      name="Area (ha)"
                      stroke="#1b9e4b"
                      fill="url(#areaFill)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}

        {/* Stored statistical summaries — crops (yield_statistics) */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Crop Statistical Summaries</CardTitle>
            <CardDescription>
              Computed per crop and barangay.{" "}
              {isAdmin
                ? "Recomputing refreshes crop, livestock, and fisheries summaries for the selected reporting period."
                : "Summaries are recomputed by the Municipal Agriculturalist."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recomputation replaces stored summaries municipality-wide, so it
                is restricted to the Municipal Agriculturalist and enforced by
                the compute-statistics Edge Function. */}
            {isAdmin && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Reporting period</Label>
                  <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => computeMutation.mutate()}
                  disabled={computeMutation.isPending}
                >
                  {computeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4" />
                  )}
                  Compute &amp; store
                </Button>
              </div>
            )}

            {stats.isLoading ? (
              <LoadingState label="Loading summaries…" />
            ) : statRows.length === 0 ? (
              <EmptyState
                title="No statistics stored yet"
                description={
                  isAdmin
                    ? "Choose a period and click Compute & store to generate summaries."
                    : "The Municipal Agriculturalist has not generated summaries for this period yet."
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop</TableHead>
                      <TableHead>Barangay</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Area (ha)</TableHead>
                      <TableHead>Total Yield</TableHead>
                      <TableHead>Avg/ha</TableHead>
                      <TableHead>Farmers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statRows.map((s) => (
                      <TableRow key={s.stat_id}>
                        <TableCell className="font-medium">{s.crops?.crop_name ?? "—"}</TableCell>
                        <TableCell>{s.barangay ?? "All"}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          <Badge variant="secondary" className="mr-1">
                            {s.period_type}
                          </Badge>
                          {formatDate(s.period_start)} – {formatDate(s.period_end)}
                        </TableCell>
                        <TableCell>{formatNumber(s.total_area_planted, 2)}</TableCell>
                        <TableCell>{formatNumber(s.total_yield, 2)}</TableCell>
                        <TableCell>{formatNumber(s.average_yield_per_hectare, 2)}</TableCell>
                        <TableCell>{formatNumber(s.farmer_count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stored statistical summaries — livestock & poultry */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Livestock & Poultry Statistical Summaries</CardTitle>
            <CardDescription>
              Computed per species and barangay for the selected reporting period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {livestockStats.isLoading ? (
              <LoadingState label="Loading summaries…" />
            ) : livestockRows.length === 0 ? (
              <EmptyState
                title="No livestock statistics stored yet"
                description={
                  isAdmin
                    ? "Use Compute & store above to generate summaries."
                    : "The Municipal Agriculturalist has not generated summaries for this period yet."
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Species</TableHead>
                      <TableHead>Barangay</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Inventory</TableHead>
                      <TableHead>Births</TableHead>
                      <TableHead>Deaths</TableHead>
                      <TableHead>Disposed</TableHead>
                      <TableHead>Production</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {livestockRows.map((s) => (
                      <TableRow key={s.stat_id}>
                        <TableCell className="font-medium">
                          {s.livestock_species?.species_name ?? "—"}
                        </TableCell>
                        <TableCell>{s.barangay ?? "All"}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          <Badge variant="secondary" className="mr-1">
                            {s.period_type}
                          </Badge>
                          {formatDate(s.period_start)} – {formatDate(s.period_end)}
                        </TableCell>
                        <TableCell>{formatNumber(s.total_inventory)}</TableCell>
                        <TableCell>{formatNumber(s.total_births)}</TableCell>
                        <TableCell>{formatNumber(s.total_deaths)}</TableCell>
                        <TableCell>{formatNumber(s.total_disposed)}</TableCell>
                        <TableCell>{formatNumber(s.total_production, 2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stored statistical summaries — fisheries */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Fisheries Statistical Summaries</CardTitle>
            <CardDescription>
              Computed per species and municipal subsector for the selected reporting period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fisheriesStats.isLoading ? (
              <LoadingState label="Loading summaries…" />
            ) : fisheriesRows.length === 0 ? (
              <EmptyState
                title="No fisheries statistics stored yet"
                description={
                  isAdmin
                    ? "Use Compute & store above to generate summaries."
                    : "The Municipal Agriculturalist has not generated summaries for this period yet."
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subsector</TableHead>
                      <TableHead>Species</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Total Catch</TableHead>
                      <TableHead>Records</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fisheriesRows.map((s) => (
                      <TableRow key={s.stat_id}>
                        <TableCell className="font-medium">
                          {s.subsector === "MARINE_MUNICIPAL"
                            ? "Marine (municipal)"
                            : "Inland (municipal)"}
                        </TableCell>
                        <TableCell>{s.species_name}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          <Badge variant="secondary" className="mr-1">
                            {s.period_type}
                          </Badge>
                          {formatDate(s.period_start)} – {formatDate(s.period_end)}
                        </TableCell>
                        <TableCell>{formatNumber(s.total_catch, 2)}</TableCell>
                        <TableCell>{formatNumber(s.catch_records)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
