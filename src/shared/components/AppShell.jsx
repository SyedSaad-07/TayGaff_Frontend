import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  LogOut,
  Package,
  Truck,
  ShoppingCart,
  History,
  BarChart3,
  Settings,
  CalendarClock,
  Users,
  Shirt,
  Tags,
  HardHat,
  Wallet,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission, isAdmin, isStaffOrAdmin, MODULES } from "@/features/auth/roles";
import { useBranch } from "@/features/branches/BranchContext";
import { BranchSwitcher } from "@/features/branches/BranchSwitcher";
import { BrandLogo } from "@/shared/components/BrandLogo";

const navActive = "bg-brass/20 text-white";
const navIdle = "text-white/65 hover:bg-white/5 hover:text-white";

function linkClass({ isActive }) {
  return `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
    isActive ? navActive : navIdle
  }`;
}

const ALL_NAV = [
  {
    to: "/dashboard",
    end: true,
    label: "Dashboard",
    icon: LayoutDashboard,
    module: MODULES.DASHBOARD,
  },
  {
    to: "/inventory",
    end: true,
    label: "Inventory",
    icon: Package,
    module: MODULES.INVENTORY,
  },
  { to: "/inventory/pos", label: "POS", icon: ShoppingCart, module: MODULES.POS },
  {
    to: "/inventory/sales",
    label: "Sales",
    icon: History,
    module: MODULES.SALES,
  },
  {
    to: "/inventory/suppliers",
    label: "Suppliers",
    icon: Truck,
    module: MODULES.SUPPLIERS,
  },
  { to: "/expenses", label: "Expenses", icon: Receipt, module: MODULES.EXPENSES },
  { to: "/reports", label: "Reports", icon: BarChart3, module: MODULES.REPORTS },
  {
    to: "/customers",
    end: true,
    label: "Customers",
    icon: Users,
    module: MODULES.CUSTOMERS,
  },
  {
    to: "/bookings",
    end: true,
    label: "Booking",
    icon: CalendarClock,
    module: MODULES.BOOKINGS,
  },
  {
    to: "/stitching",
    end: true,
    label: "Stitching",
    icon: Shirt,
    module: MODULES.STITCHING,
  },
  { to: "/garments", end: true, label: "Garments", icon: Tags, module: MODULES.GARMENTS },
  {
    to: "/karigars",
    end: true,
    label: "Karigars",
    icon: HardHat,
    module: MODULES.KARIGARS,
  },
  {
    to: "/karigar-payroll",
    end: true,
    label: "Karigar pay",
    icon: Wallet,
    module: MODULES.KARIGARS,
  },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const admin = isAdmin(user);
  const staffOrAdmin = isStaffOrAdmin(user);
  const { isAllBranches, selectedBranch } = useBranch();
  const location = useLocation();

  const path = location.pathname;
  const showBranchSwitcher =
    staffOrAdmin &&
    (path === "/dashboard" ||
      path === "/finance" ||
      path === "/reports" ||
      path.startsWith("/expenses") ||
      path.startsWith("/inventory") ||
      path.startsWith("/bookings"));

  const navItems = [
    ...ALL_NAV.filter((item) => hasPermission(user, item.module)),
    ...(admin
      ? [
          { to: "/trash", label: "Trash", icon: Trash2, end: true },
          { to: "/settings", label: "Settings", icon: Settings, end: undefined },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-atelier lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-b border-slate-line bg-ink text-white print:hidden lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-ink-muted">
        <div className="flex items-center px-4 py-5">
          <BrandLogo className="h-11 w-auto max-w-[200px] object-contain object-left" />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={linkClass}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden px-4 pb-6 pt-4 lg:block">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="mt-0.5 truncate text-xs text-white/45">{user?.email}</p>
            <button
              type="button"
              onClick={logout}
              className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-brass-soft transition hover:text-white"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-line/80 bg-mist/70 px-4 py-3 backdrop-blur print:hidden sm:px-6 lg:px-8">
          <div className="min-w-0 lg:hidden">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-ink/50">{user?.email}</p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {showBranchSwitcher ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink/40">
                    Shop / branch
                  </p>
                  <p className="text-sm font-medium text-ink">
                    {isAllBranches
                      ? "All shops"
                      : selectedBranch?.name || "No shop"}
                  </p>
                </div>
                <BranchSwitcher />
              </>
            ) : null}
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-3 py-2 text-xs font-medium lg:hidden"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
