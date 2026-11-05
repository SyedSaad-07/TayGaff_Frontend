import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarClock, CircleDollarSign, Ban, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import {
  ChartCard,
  CHART_COLORS,
  currencyTick,
  KpiCard,
  Panel,
} from "@/features/overview/dashboardUi";

function downloadCsv(rows, filename) {
  if (!rows?.length) return;
  const headers = [
    "Folio",
    "Customer",
    "Service",
    "Date",
    "Status",
    "Amount",
    "Paid",
    "Balance",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.folio,
        `"${String(r.customer || "").replace(/"/g, '""')}"`,
        `"${String(r.service || "").replace(/"/g, '""')}"`,
        r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
        r.status,
        r.amount,
        r.paid,
        r.balance,
      ].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BookingsTab({ data }) {
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const sorted = useMemo(() => {
    const rows = [...(data?.table || [])];
    rows.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === "date") {
        av = new Date(av || 0).getTime();
        bv = new Date(bv || 0).getTime();
      }
      if (typeof av === "string") {
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [data?.table, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "date" || key === "amount" ? "desc" : "asc");
    }
  };

  if (!data?.cards) return null;
  const cards = data.cards;
  const maxHeat = Math.max(
    1,
    ...(data.charts?.heatmap || []).map((h) => h.count)
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard icon={CalendarClock} label="Bookings" hint="Created in period">
          <p className="font-display text-3xl text-ink">
            {Number(cards.bookingsCount || 0).toLocaleString("en-PK")}
          </p>
        </KpiCard>
        <KpiCard
          icon={CircleDollarSign}
          label="Order value"
          hint="Non-cancelled booking totals"
        >
          <p className="font-display text-3xl text-ink">
            {formatCurrency(cards.orderValue)}
          </p>
        </KpiCard>
        <KpiCard label="Collected" hint="Payments by paidAt">
          <p className="font-display text-3xl text-ink">
            {formatCurrency(cards.revenueCollected)}
          </p>
        </KpiCard>
        <KpiCard icon={Wallet} label="Pending / deposit" hint="Open balances">
          <p className="font-display text-3xl text-ink">
            {formatCurrency(cards.pendingDeposit)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {cards.pendingCount} open with balance
          </p>
        </KpiCard>
        <KpiCard icon={Ban} label="Cancel rate" hint="Of bookings created">
          <p className="font-display text-3xl text-ink">
            {cards.cancellationRate}%
          </p>
        </KpiCard>
        <KpiCard label="Avg booking value" hint="Order total (not cash)">
          <p className="font-display text-3xl text-ink">
            {formatCurrency(cards.avgBookingValue)}
          </p>
        </KpiCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Collections trend" subtitle="Booking payments">
          {(data.charts?.trend || []).length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted">
              No payments in this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.charts.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e2da" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={currencyTick} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Collected"
                  stroke={CHART_COLORS.bookings}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Status funnel" subtitle="Bookings created in period">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.charts?.funnel || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e2da" />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar
                dataKey="count"
                name="Bookings"
                fill={CHART_COLORS.bookings}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Peak days" subtitle="Bookings by weekday (Asia/Karachi)">
          <div className="grid grid-cols-7 gap-2">
            {(data.charts?.heatmap || []).map((h) => {
              const intensity = h.count / maxHeat;
              return (
                <div key={h.day} className="text-center">
                  <div
                    className="mx-auto flex h-16 w-full items-end justify-center rounded-xl"
                    style={{
                      background: `rgba(28, 43, 70, ${0.08 + intensity * 0.55})`,
                    }}
                    title={`${h.count} · ${formatCurrency(h.revenue)}`}
                  >
                    <span className="pb-2 text-sm font-semibold text-ink">
                      {h.count}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{h.day}</p>
                </div>
              );
            })}
          </div>
        </Panel>

        <ChartCard title="Service revenue" subtitle="Order value by garment">
          {(data.charts?.byService || []).length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted">
              No services in this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.byService} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e2da" />
                <XAxis type="number" tickFormatter={currencyTick} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar
                  dataKey="revenue"
                  name="Order value"
                  fill={CHART_COLORS.inventory}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <Panel
        title="Bookings"
        subtitle="Created in selected period"
        actions={
          <button
            type="button"
            onClick={() => downloadCsv(sorted, `bookings-${Date.now()}.csv`)}
            className="rounded-xl border border-slate-line px-3 py-1.5 text-sm font-medium hover:bg-mist"
          >
            Export CSV
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted">
                {[
                  ["folio", "Folio"],
                  ["customer", "Customer"],
                  ["service", "Service"],
                  ["date", "Date"],
                  ["status", "Status"],
                  ["amount", "Amount"],
                  ["paid", "Paid"],
                ].map(([key, label]) => (
                  <th key={key} className="pb-2 pr-3">
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className="font-semibold hover:text-ink"
                    >
                      {label}
                      {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-muted">
                    No bookings in this period.
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr key={String(r.id)} className="border-t border-slate-line/60">
                    <td className="py-2.5 pr-3">
                      <Link
                        to={`/bookings/${r.id}`}
                        className="font-medium text-brass-deep hover:underline"
                      >
                        {r.folio}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3">{r.customer}</td>
                    <td className="py-2.5 pr-3 text-muted">{r.service || "—"}</td>
                    <td className="py-2.5 pr-3">
                      {r.date ? formatDate(r.date) : "—"}
                    </td>
                    <td className="py-2.5 pr-3">{r.status}</td>
                    <td className="py-2.5 pr-3">{formatCurrency(r.amount)}</td>
                    <td className="py-2.5 pr-3">{formatCurrency(r.paid)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
