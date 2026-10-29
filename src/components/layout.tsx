import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { endpoints } from "../lib/api";
import type { User } from "../types";

const nav = [
  { to: "/dashboard", label: "Overview", icon: "⌂" },
  { to: "/customers", label: "Customers", icon: "◒" },
  { to: "/agreements", label: "Agreements", icon: "◈" },
  { to: "/operations", label: "Operations", icon: "↗" },
  { to: "/invoices", label: "Invoices", icon: "▤" },
  { to: "/assets", label: "Equipment", icon: "◫" },
  { to: "/catalog", label: "Service catalog", icon: "◆" },
  { to: "/reports", label: "Reports", icon: "▥" },
  { to: "/integrations", label: "Integrations", icon: "↯" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

const technicianNav = [{ to: "/my-work", label: "My Work", icon: "✓" }];

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    endpoints.auth
      .me()
      .then((value) => {
        if (live) {
          setUser(value);
          setLoadingUser(false);
        }
      })
      .catch(() => {
        if (live) {
          setLoadingUser(false);
          navigate("/login", { replace: true });
        }
      });

    return () => {
      live = false;
    };
  }, [navigate]);

  async function logout() {
    try {
      await endpoints.auth.logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  if (loadingUser || !user) {
    return <div className="center-load" role="status">Loading your workspace…</div>;
  }

  const visibleNav = user.role === "technician" ? technicianNav : nav;
  const current =
    visibleNav.find((item) =>
      item.to === "/dashboard"
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to),
    )?.label || (user.role === "technician" ? "My Work" : "Overview");

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <NavLink
          className="brand"
          to={user.role === "technician" ? "/my-work" : "/dashboard"}
          aria-label="Service Agreement Manager workspace"
        >
          <span className="brand-mark">SA</span>
          <div>
            <strong>Service Agreement</strong>
            <span>Manager</span>
          </div>
        </NavLink>
        <nav aria-label="Workspace navigation">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard" || item.to === "/my-work"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                isActive ? "nav-item nav-active" : "nav-item"
              }
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" />
          Connected workspace
        </div>
      </aside>
      {open && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <main className="main">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            ☰
          </button>
          <div className="crumb">
            <span>Workspace</span>
            <b>/</b>
            <strong>{current}</strong>
          </div>
          <div className="top-user">
            <div className="avatar">
              {user?.full_name?.slice(0, 1).toUpperCase() || "U"}
            </div>
            <div>
              <strong>{user?.full_name || "Loading…"}</strong>
              <span>{user?.role || ""}</span>
            </div>
            <button
              className="ghost-button"
              onClick={() => void logout()}
            >
              Sign out
            </button>
          </div>
        </header>
        <div className="content">
          <Outlet context={{ user }} />
        </div>
      </main>
    </div>
  );
}
