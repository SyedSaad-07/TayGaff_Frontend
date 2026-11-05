import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Users,
  Banknote,
  Receipt,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

/**
 * Simple reports menu — same idea as the reference system:
 * one clear list of report types, big clickable rows, plain language.
 */
const REPORTS = [
  {
    to: "/dashboard",
    title: "Business overview",
    description: "Total sales, returns, items, and suppliers on one screen",
    icon: LayoutDashboard,
  },
  {
    to: "/inventory/sales",
    title: "Sales & returns",
    description: "All sale invoices, payments, and return history",
    icon: ShoppingCart,
  },
  {
    to: "/finance",
    title: "Expense reports",
    description: "Spend by day, week, month, and category",
    icon: Receipt,
  },
  {
    to: "/inventory",
    title: "Inventory",
    description: "Stock levels, cloth lots, and low-stock items",
    icon: Package,
  },
  {
    to: "/inventory/suppliers",
    title: "Suppliers",
    description: "Vendor list and supplier details",
    icon: Truck,
  },
  {
    to: "/bookings",
    title: "Customers (coming soon)",
    description: "Customer list will open with the Booking module",
    icon: Users,
    soon: true,
  },
  {
    to: "/inventory/sales",
    title: "Payments",
    description: "Open a sale to see payment history and add payments",
    icon: Banknote,
  },
  {
    to: "/dashboard",
    title: "Sales trend",
    description: "Year-to-date sales charts on the main dashboard",
    icon: TrendingUp,
  },
];

export function ReportsHubPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
          Reports
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">Choose a report</h1>
        <p className="mt-2 text-sm text-muted">
          Tap one option below. Each opens a clear page with numbers and lists.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-line/80 bg-white">
        {REPORTS.map((report) => (
          <Link
            key={`${report.to}-${report.title}`}
            to={report.to}
            className="flex items-center gap-4 border-b border-slate-line/70 px-4 py-4 transition last:border-b-0 hover:bg-mist/80"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brass/10 text-brass">
              <report.icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">
                {report.title}
                {report.soon ? (
                  <span className="ml-2 text-xs font-normal text-muted">(soon)</span>
                ) : null}
              </p>
              <p className="mt-0.5 text-sm text-muted">{report.description}</p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
