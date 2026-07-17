import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ConfigNotice } from "@/components/shared/ConfigNotice";
import { AppLayout } from "@/components/shared/AppLayout";
import { LoadingState } from "@/components/shared/states";
import LoginPage from "@/pages/Login";
import ResetPasswordPage from "@/pages/ResetPassword";
import DashboardPage from "@/pages/Dashboard";
import FarmersPage from "@/pages/Farmers";
import FarmsPage from "@/pages/Farms";
import PlotsPage from "@/pages/Plots";
import CropsPage from "@/pages/Crops";
import PlantingPage from "@/pages/Planting";
import HarvestPage from "@/pages/Harvest";
import AnalyticsPage from "@/pages/Analytics";
import ReportsPage from "@/pages/Reports";
import UsersPage from "@/pages/Users";
import BackupPage from "@/pages/Backup";
import AuditLogsPage from "@/pages/AuditLogs";
import NotFoundPage from "@/pages/NotFound";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Starting AGRODATA…" />
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigNotice />;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/farmers" element={<FarmersPage />} />
        <Route path="/farms" element={<FarmsPage />} />
        <Route path="/plots" element={<PlotsPage />} />
        <Route path="/crops" element={<CropsPage />} />
        <Route path="/planting" element={<PlantingPage />} />
        <Route path="/harvest" element={<HarvestPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route
          path="/users"
          element={
            <RequireAdmin>
              <UsersPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/backup"
          element={
            <RequireAdmin>
              <BackupPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <RequireAdmin>
              <AuditLogsPage />
            </RequireAdmin>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
