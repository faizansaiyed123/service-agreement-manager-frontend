import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useOutletContext } from "react-router-dom";
import { AppShell } from "./components/layout";
import { endpoints } from "./lib/api";
import { publicRegistrationEnabled } from "./lib/features";
import type { Role, User } from "./types";
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
import {
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from "./pages/PasswordRecovery";
import { AgreementPortalPage } from "./pages/AgreementPortal";
import { InvoicePortalPage } from "./pages/InvoicePortal";
import { TechnicianPage } from "./pages/Technician";
import { IntegrationsPage } from "./pages/Integrations";
import { CustomerPortalInvitationPage, CustomerPortalLoginPage, CustomerPortalPage } from "./pages/CustomerPortal";
import { TechnicianInvitationPage } from "./pages/TechnicianInvitation";

const workspaceRoles: Role[] = ["owner", "admin", "manager", "billing", "staff"];

function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useOutletContext<{ user: User | null }>();
  if (!user) {
    return <div className="center-load" role="status">Loading your workspace…</div>;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={user.role === "technician" ? "/my-work" : "/dashboard"} replace />;
  }
  return <>{children}</>;
}

function Protected({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<
    "checking" | "authenticated" | "unauthenticated"
  >("checking");

  useEffect(() => {
    let live = true;
    const onExpired = () => {
      if (live) setStatus("unauthenticated");
    };
    window.addEventListener("sam:session-expired", onExpired);
    endpoints.auth
      .me()
      .then(() => {
        if (live) setStatus("authenticated");
      })
      .catch(() => {
        if (live) setStatus("unauthenticated");
      });

    return () => {
      live = false;
      window.removeEventListener("sam:session-expired", onExpired);
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="center-load" role="status">
        Checking your session…
      </div>
    );
  }

  return status === "authenticated" ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route
        path="/register"
        element={
          publicRegistrationEnabled ? (
            <AuthPage mode="register" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/agreement/:token" element={<AgreementPortalPage />} />
      <Route path="/invoice/:token" element={<InvoicePortalPage />} />
      <Route path="/customer-portal/login" element={<CustomerPortalLoginPage />} />
      <Route path="/customer-portal/invitation/:token" element={<CustomerPortalInvitationPage />} />
      <Route path="/customer-portal" element={<CustomerPortalPage />} />
      <Route path="/team/invitation/:token" element={<TechnicianInvitationPage />} />

      <Route element={<Protected><AppShell /></Protected>}>
        <Route path="my-work" element={<RoleGate roles={["technician"]}><TechnicianPage /></RoleGate>} />
        <Route path="dashboard" element={<RoleGate roles={workspaceRoles}><OverviewPage /></RoleGate>} />
        <Route path="customers" element={<RoleGate roles={workspaceRoles}><CustomersPage /></RoleGate>} />
        <Route path="agreements" element={<RoleGate roles={workspaceRoles}><AgreementsPage /></RoleGate>} />
        <Route path="operations" element={<RoleGate roles={workspaceRoles}><OperationsPage /></RoleGate>} />
        <Route path="invoices" element={<RoleGate roles={workspaceRoles}><InvoicesPage /></RoleGate>} />
        <Route path="assets" element={<RoleGate roles={workspaceRoles}><EquipmentPage /></RoleGate>} />
        <Route path="catalog" element={<RoleGate roles={workspaceRoles}><CatalogPage /></RoleGate>} />
        <Route path="settings" element={<RoleGate roles={workspaceRoles}><SettingsPage /></RoleGate>} />
        <Route path="reports" element={<RoleGate roles={workspaceRoles}><ReportsPage /></RoleGate>} />
        <Route path="integrations" element={<RoleGate roles={workspaceRoles}><IntegrationsPage /></RoleGate>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
