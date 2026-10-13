import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/layout";
import { readSession } from "./lib/storage";
import { AuthPage } from "./pages/Auth";
import { OverviewPage } from "./pages/Overview";
import { PlaceholderPage } from "./pages/Placeholder";
import { CustomersPage } from "./pages/Customers";
import { AgreementsPage } from "./pages/Agreements";
import { OperationsPage } from "./pages/Operations";

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
      <Route path="invoices" element={<PlaceholderPage title="Invoices" eyebrow="Billing"/>}/>
      <Route path="assets" element={<PlaceholderPage title="Equipment" eyebrow="Assets"/>}/>
      <Route path="catalog" element={<PlaceholderPage title="Service catalog" eyebrow="Pricing"/>}/>
      <Route path="settings" element={<PlaceholderPage title="Settings" eyebrow="Administration"/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}