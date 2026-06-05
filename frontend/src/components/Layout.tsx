import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useRealtime } from "../hooks/useRealtime";
import { useAuth } from "../store/auth";
import { Icon, IconName } from "./Icon";
import { Toaster } from "./Toaster";

export function Layout() {
  useRealtime();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links: { to: string; label: string; icon: IconName }[] =
    user?.role === "ADMIN"
      ? [
          { to: "/admin", label: "Driver verification", icon: "shield" },
          { to: "/admin/analytics", label: "Demand analytics", icon: "chart" },
        ]
      : user?.role === "DRIVER"
        ? [
            { to: "/driver", label: "Dispatch", icon: "navigation" },
            { to: "/driver/dashboard", label: "Dashboard", icon: "grid" },
            { to: "/driver/profile", label: "Vehicle", icon: "rickshaw" },
          ]
        : [
            { to: "/passenger", label: "Book a ride", icon: "pickup" },
            { to: "/passenger/history", label: "My rides", icon: "history" },
          ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-brand-700">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              R
            </span>
            IITR Rides
          </Link>

          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <Icon name={l.icon} size={16} />
                <span className="hidden sm:inline">{l.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-slate-500 hover:text-rose-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>

      <Toaster />
    </div>
  );
}
