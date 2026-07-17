import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Calculator, Loader2 } from "lucide-react";
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
  buildForecast,
  computeAndStoreYieldStatistics,
  fetchYieldStatistics,
  fetchYieldTrend,
} from "@/features/analytics";
import type { PeriodType } from "@/types/database";

export default function AnalyticsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [periodType, setPeriodType] = React.useState<PeriodType>("YEARLY");

  const trend = useQuery({ queryKey: ["yield-trend"], queryFn: fetchYieldTrend });
  const stats = useQuery({ queryKey: ["yield-statistics"], queryFn: fetchYieldStatistics });

  const forecast = React.useMemo(
    () => (trend.data ? buildForecast(trend.data, 2) : []),
    [trend.data]
  );

  const computeMutation = useMutation({
    mutationFn: () => computeAndStoreYieldStatistics(periodType),
    onSuccess: async (count) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "COMPUTE_STATISTICS",
        entity: "yield_statistics",
        details: `${periodType} · ${count} summaries`,
      });
      toast({
        title: "Statistics computed",
        description: `${count} ${periodType.toLowerCase()} summary record(s) stored.`,
        variant: "success",
      });
      qc.invalidateQueries({ queryKey: ["yield-statistics"] });
    },
    onError: (err: unknown) =>
      toast({
        title: "Could not compute statistics",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      }),
  });

  const lastForecast = forecast.filter((f) => f.forecast !== null && f.actual === null);
  const hasData = (trend.data?.length ?? 0) >= 2;
  const statRows = stats.data ?? [];

  return (
    <div>
      <PageHeader
        title="Analytics & Forecasts"
        description="Statistical summaries, crop yield trend analysis, and basic production forecasting."
      />

      <div className="space-y-6">
        {trend.isLoading ? (
          <LoadingState label="Computing analytics…" />
        ) : !hasData ? (
          <Card>
            <EmptyState
              title="Not enough historical data"
              description="At least two years of harvest records are needed to compute trends and forecasts."
            />
          </Card>
        ) : (
          <>
            {lastForecast.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {lastForecast.map((f) => (
                  <Card key={f.period}>
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Forecast yield · {f.period}</p>
                        <p className="text-2xl font-bold">{formatNumber(f.forecast, 2)}</p>
                        <Badge variant="secondary" className="mt-1">
                          Linear trend projection
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Crop Yield Trend & Forecast</CardTitle>
                <CardDescription>
                  Solid line shows historical recorded yield; dashed line projects the next periods
                  using least-squares linear regression over historical patterns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={forecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => formatNumber(v, 2)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual yield"
                      stroke="#1b9e4b"
                      strokeWidth={2.5}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name="Forecast"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      strokeDasharray="6 4"
                      connectNulls
                    />
                  </ComposedChart>
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

        {/* Stored statistical summaries (Yield_Statistics) */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Statistical Summaries</CardTitle>
            <CardDescription>
              Computed per crop and barangay, stored for the selected reporting period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Button onClick={() => computeMutation.mutate()} disabled={computeMutation.isPending}>
                {computeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4" />
                )}
                Compute &amp; store
              </Button>
            </div>

            {stats.isLoading ? (
              <LoadingState label="Loading summaries…" />
            ) : statRows.length === 0 ? (
              <EmptyState
                title="No statistics stored yet"
                description="Choose a period and click Compute & store to generate summaries."
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
      </div>
    </div>
  );
}
