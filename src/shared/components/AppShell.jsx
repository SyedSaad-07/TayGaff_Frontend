import { useEffect, useState } from "react";
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
  Scissors,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import {
  hasPermission,
  isAdmin,
  isStaffOrAdmin,
  MODULES,
} from "@/features/auth/roles";
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
  {
    to: "/garments",
    end: true,
    label: "Garments",
    icon: Tags,
    module: MODULES.GARMENTS,
  },
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
  {
    to: "/cutters",
    end: true,
    label: "Cutters",
    icon: Scissors,
    module: MODULES.CUTTERS,
  },
  {
    to: "/cutter-payroll",
    end: true,
    label: "Cutter pay",
    icon: Wallet,
    module: MODULES.CUTTERS,
  },
  {
    to: "/pressmen",
    end: true,
    label: "Pressman",
    icon: Shirt,
    module: MODULES.PRESSMAN,
  },
  {
    to: "/accessories",
    end: true,
    label: "Accessories",
    icon: Tags,
    module: MODULES.ACCESSORIES,
  },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const admin = isAdmin(user);
  const staffOrAdmin = isStaffOrAdmin(user);
  const { isAllBranches, selectedBranch } = useBranch();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  const path = location.pathname;
  const showBranchSwitcher =
    staffOrAdmin &&
    (path === "/dashboard" ||
      path === "/finance" ||
      path.startsWith("/reports") ||
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

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 480px)");
    const onChange = () => {
      if (mq.matches) setNavOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="shell bg-atelier">
      {navOpen ? (
        <button
          type="button"
          className="shell-scrim"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside className={`shell-sidebar ${navOpen ? "is-open" : ""}`}>
        <div className="shell-sidebar-head">
          <BrandLogo className="h-11 w-auto max-w-[180px] object-contain object-left" />
          <button
            type="button"
            className="shell-icon-btn shell-only-mobile"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="shell-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={linkClass}
              onClick={() => setNavOpen(false)}
            >
              <item.icon size={18} className="shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shell-sidebar-foot">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
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

      <div className="shell-main">
        <header className="shell-topbar">
          <button
            type="button"
            className="shell-menu-btn shell-only-mobile"
            aria-label="Open navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="shell-only-mobile min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
            <p className="truncate text-xs text-ink/50">{user?.email}</p>
          </div>

          <div className="ml-auto flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            {showBranchSwitcher ? (
              <>
                <div className="shell-branch-label">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink/40">
                    Shop / branch
                  </p>
                  <p className="max-w-[10rem] truncate text-sm font-medium text-ink">
                    {isAllBranches
                      ? "All shops"
                      : selectedBranch?.name || "No shop"}
                  </p>
                </div>
                <div className="w-[min(100%,12rem)] sm:w-56">
                  <BranchSwitcher />
                </div>
              </>
            ) : null}
          </div>
        </header>

        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
