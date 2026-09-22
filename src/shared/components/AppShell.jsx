import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  LogOut,
  Scissors,
  CalendarClock,
  Building2,
  LayoutGrid,
  Package,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { isAdmin } from "@/features/auth/roles";
import { useBranch } from "@/features/branches/BranchContext";
import { BranchSwitcher } from "@/features/branches/BranchSwitcher";

const navActive = "bg-brass/20 text-white";
const navIdle = "text-white/65 hover:bg-white/5 hover:text-white";

function linkClass({ isActive }) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
    isActive ? navActive : navIdle
  }`;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const admin = isAdmin(user);
  const { isAllBranches, selectedBranch } = useBranch();
  const location = useLocation();

  const path = location.pathname;
  const inExpenses =
    path === "/finance" || path.startsWith("/expenses");
  const inBranches = path.startsWith("/branches");
  const inInventory = path.startsWith("/inventory");
  const inBookings = path.startsWith("/bookings");
  const showBranchSwitcher = admin && (inExpenses || inInventory);

  return (
    <div className="min-h-screen bg-atelier lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="flex flex-col border-b border-slate-line bg-ink text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-ink-muted">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brass/25 text-brass-soft">
            <Scissors size={18} />
          </div>
          <div>
            <p className="font-display text-2xl leading-none">
              Tay<span className="italic text-brass-soft">Gaff</span>
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/45">
              Tailor Shop
            </p>
          </div>
        </div>

        <nav className="space-y-1 px-3 pb-4">
          {admin ? (
            <>
              <NavLink to="/modules" className={linkClass}>
                <LayoutGrid size={17} />
                Modules
              </NavLink>

              {inExpenses ? (
                <>
                  <p className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-[0.18em] text-white/35">
                    Expenses
                  </p>
                  <NavLink to="/finance" end className={linkClass}>
                    <LayoutDashboard size={17} />
                    Dashboard
                  </NavLink>
                  <NavLink to="/expenses" className={linkClass}>
                    <Receipt size={17} />
                    Expenses
                  </NavLink>
                </>
              ) : null}

              {inBranches ? (
                <>
                  <p className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-[0.18em] text-white/35">
                    Branches
                  </p>
                  <NavLink to="/branches" className={linkClass}>
                    <Building2 size={17} />
                    Manage branches
                  </NavLink>
                </>
              ) : null}

              {inInventory ? (
                <>
                  <p className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-[0.18em] text-white/35">
                    Inventory
                  </p>
                  <NavLink to="/inventory" end className={linkClass}>
                    <Package size={17} />
                    Inventory
                  </NavLink>
                </>
              ) : null}

              {inBookings ? (
                <>
                  <p className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-[0.18em] text-white/35">
                    Booking
                  </p>
                  <NavLink to="/bookings" className={linkClass}>
                    <CalendarClock size={17} />
                    Booking
                  </NavLink>
                </>
              ) : null}
            </>
          ) : (
            <NavLink to="/bookings" className={linkClass}>
              <CalendarClock size={17} />
              Booking
            </NavLink>
          )}
        </nav>

        <div className="mt-auto hidden px-4 pb-6 pt-6 lg:block">
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
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-line/80 bg-mist/70 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="min-w-0 lg:hidden">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-ink/50">{user?.email}</p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {showBranchSwitcher ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink/40">
                    Active view
                  </p>
                  <p className="text-sm font-medium text-ink">
                    {isAllBranches
                      ? "All branches statistics"
                      : selectedBranch?.name || "No branch"}
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
