import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Map,
  Sprout,
  Wheat,
  Ruler,
  Scale,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, EmptyState } from "@/components/shared/states";
import { formatNumber } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchAreaByBarangay,
  fetchDashboardSummary,
  fetchYieldByCrop,
  fetchYieldTrend,
} from "@/features/analytics";

const PIE_COLORS = ["#1b9e4b", "#5cb85c", "#84cc16", "#22c55e", "#15803d", "#65a30d", "#a3e635", "#16a34a"];

export default function DashboardPage() {
  const { profile } = useAuth();
  const summary = useQuery({ queryKey: ["dashboard-summary"], queryFn: fetchDashboardSummary });
  const byCrop = useQuery({ queryKey: ["yield-by-crop"], queryFn: fetchYieldByCrop });
  const byBarangay = useQuery({ queryKey: ["area-by-barangay"], queryFn: fetchAreaByBarangay });
  const trend = useQuery({ queryKey: ["yield-trend"], queryFn: fetchYieldTrend });

  const s = summary.data;

  return (
    <div>
      <PageHeader
        title={`Welcome${profile ? `, ${profile.first_name}` : ""}`}
        description="Overview of agricultural data and key performance indicators for the OMA."
      />

      {summary.isLoading ? (
        <LoadingState label="Loading dashboard…" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Registered Farmers" value={formatNumber(s?.farmerCount)} icon={Users} accent="primary" />
            <StatCard label="Farms" value={formatNumber(s?.farmCount)} icon={Map} accent="emerald" />
            <StatCard label="Crop Types" value={formatNumber(s?.cropCount)} icon={Sprout} accent="sky" />
            <StatCard label="Active Plantings" value={formatNumber(s?.activePlantings)} icon={Wheat} accent="amber" />
            <StatCard
              label="Total Area Planted"
              value={`${formatNumber(s?.totalAreaPlanted, 2)} ha`}
              icon={Ruler}
              accent="primary"
            />
            <StatCard
              label="Total Yield Recorded"
              value={`${formatNumber(s?.totalYield, 2)}`}
              icon={Scale}
              accent="emerald"
              hint="aggregate harvested quantity"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Crop Production Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {byCrop.data && byCrop.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={byCrop.data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(e) => e.name}
                      >
                        {byCrop.data.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatNumber(v, 2)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState title="No harvest data yet" description="Record harvests to see distribution." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Area Planted by Barangay (ha)</CardTitle>
              </CardHeader>
              <CardContent>
                {byBarangay.data && byBarangay.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={byBarangay.data.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis fontSize={12} />
                      <Tooltip formatter={(v: number) => `${formatNumber(v, 2)} ha`} />
                      <Bar dataKey="value" fill="#1b9e4b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState title="No planting data yet" description="Record plantings to compare barangays." />
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Yearly Yield & Area Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {trend.data && trend.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trend.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="yield" name="Yield" stroke="#1b9e4b" strokeWidth={2} />
                      <Line type="monotone" dataKey="area" name="Area (ha)" stroke="#0ea5e9" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState title="No trend data yet" description="Historical trends appear as records accumulate." />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
