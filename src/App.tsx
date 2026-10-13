import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/layout";
import { readSession } from "./lib/storage";
import { AuthPage } from "./pages/Auth";
import { OverviewPage } from "./pages/Overview";
import { CustomersPage } from "./pages/Customers";
import { AgreementsPage } from "./pages/Agreements";
import { OperationsPage } from "./pages/Operations";
import { InvoicesPage } from "./pages/Invoices";
import { CatalogPage, EquipmentPage } from "./pages/Assets";
import { SettingsPage } from "./pages/Settings";
import { ReportsPage } from "./pages/Reports";
import { IntegrationsPage } from "./pages/Integrations";

function Protected({children}:{children:ReactNode}){
  const location=useLocation();
  return readSession()?<>{children}</>:<Navigate to="/login" replace state={{from:location}}/>;
}
export default function App(){
  return <Routes>
    <Route path="/login" element={<AuthPage mode="login"/>}/><Route path="/register" element={<AuthPage mode="register"/>}/>
    <Route element={<Protected><AppShell/></Protected>}>
      <Route index element={<OverviewPage/>}/>
      <Route path="customers" element={<CustomersPage/>}/>
      <Route path="agreements" element={<AgreementsPage/>}/>
      <Route path="operations" element={<OperationsPage/>}/>
      <Route path="invoices" element={<InvoicesPage/>}/>
      <Route path="assets" element={<EquipmentPage/>}/>
      <Route path="catalog" element={<CatalogPage/>}/>
      <Route path="settings" element={<SettingsPage/>}/>
      <Route path="reports" element={<ReportsPage/>}/>
      <Route path="integrations" element={<IntegrationsPage/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}