import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/layout";
import { endpoints } from "./lib/api";
import { AuthPage } from "./pages/Auth";
import { LandingPage } from "./pages/LandingPage";
import { OverviewPage } from "./pages/Overview";
import { CustomersPage } from "./pages/Customers";
import { AgreementsPage } from "./pages/Agreements";
import { OperationsPage } from "./pages/Operations";
import { InvoicesPage } from "./pages/Invoices";
import { CatalogPage, EquipmentPage } from "./pages/Assets";
import { SettingsPage } from "./pages/Settings";
import { ReportsPage } from "./pages/Reports";
import { ForgotPasswordPage, ResetPasswordPage } from "./pages/PasswordRecovery";
import { IntegrationsPage } from "./pages/Integrations";

function Protected({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");

  useEffect(() => {
    let live = true;
    const onExpired = () => {
      if (live) setStatus("unauthenticated");
    };
    window.addEventListener("sam:session-expired", onExpired);
    endpoints.auth.me()
      .then(() => { if (live) setStatus("authenticated"); })
      .catch(() => { if (live) setStatus("unauthenticated"); });

    return () => {
      live = false;
      window.removeEventListener("sam:session-expired", onExpired);
    };
  }, []);

  if (status === "checking") {
    return <div className="center-load" role="status">Checking your session…</div>;
  }

  return status === "authenticated"
    ? <>{children}</>
    : <Navigate to="/login" replace state={{ from: location }} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<Protected><AppShell /></Protected>}>
        <Route path="dashboard" element={<OverviewPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="agreements" element={<AgreementsPage />} />
        <Route path="operations" element={<OperationsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="assets" element={<EquipmentPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
