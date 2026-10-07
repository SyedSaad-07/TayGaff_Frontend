import { Link } from "react-router-dom";
import {
  Receipt,
  Package,
  CalendarClock,
  ArrowRight,
  LayoutGrid,
  Building2,
  LogOut,
  Scissors,
  FileText,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";

const modules = [
  {
    to: "/finance",
    title: "Expenses Dashboard",
    description:
      "Track branch-wise shop expenses, filters, and financial breakdowns.",
    icon: Receipt,
    cta: "Open expenses",
  },
  {
    to: "/inventory",
    title: "Inventory Management",
    description:
      "Manage cloth purchases by length, credit payments, and clothing sales.",
    icon: Package,
    cta: "Open inventory",
  },
  {
    to: "/branches",
    title: "Branch Management",
    description:
      "Create and manage shop branches used across expenses and reporting.",
    icon: Building2,
    cta: "Open branches",
  },
  {
    to: "/bookings",
    title: "Booking",
    description:
      "Appointments, fittings, and sizing workflows in one booking workspace.",
    icon: CalendarClock,
    cta: "Open booking",
  },
];

export function AdminModulesPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-atelier">
      <header className="flex items-center justify-between border-b border-slate-line/70 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brass/10 text-brass">
            <Scissors size={18} />
          </div>
          <div>
            <p className="font-display text-2xl leading-none text-ink">
              Tay<span className="italic text-brass">Gaff</span>
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted">
              Tailor Shop
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-ink">{user?.name}</p>
            <p className="text-xs text-muted">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-line bg-mist px-3 py-2 text-xs font-medium text-ink/70 transition hover:border-brass/40 hover:text-ink"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-brass/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">
            <LayoutGrid size={12} />
            Admin workspace
          </p>
          <h1 className="mt-4 font-display text-4xl text-ink sm:text-5xl">
            Choose a <span className="italic text-brass">module</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            Select where you want to work. Use “Modules” in any dashboard to
            return here.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((mod, index) => (
            <Link
              key={mod.to}
              to={mod.to}
              className="group flex flex-col rounded-3xl border border-slate-line/80 bg-mist/90 p-6 shadow-[0_16px_40px_-28px_rgba(28,43,70,0.45)] transition hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-[0_20px_44px_-24px_rgba(59,91,219,0.35)]"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brass/10 text-brass">
                <mod.icon size={22} />
              </div>
              <h2 className="mt-5 font-display text-2xl text-ink">{mod.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                {mod.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brass transition group-hover:gap-3">
                {mod.cta}
                <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <Link
            to="/docs/legacy-schema"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-line bg-mist/80 px-4 py-3 text-sm text-ink/80 transition hover:border-brass/40 hover:text-ink"
          >
            <FileText size={16} className="text-brass" />
            Legacy data schema map
            <ArrowRight size={14} />
          </Link>
        </div>
      </main>
    </div>
  );
}
