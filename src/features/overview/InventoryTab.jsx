import { useMemo, useState } from "react";
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
import { Package, AlertTriangle, CircleDollarSign } from "lucide-react";
import { formatCurrency } from "@/shared/lib/format";
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
    "SKU",
    "Product",
    "Category",
    "Qty sold",
    "Revenue",
    "Margin",
    "Stock left",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.sku,
        `"${String(r.productName || "").replace(/"/g, '""')}"`,
        r.category,
        r.qtySold,
        r.revenue,
        r.margin,
        r.stockLeft,
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

export function InventoryTab({ data }) {
  const [sortKey, setSortKey] = useState("revenue");
  const [sortDir, setSortDir] = useState("desc");

  const sorted = useMemo(() => {
    const rows = [...(data?.table || [])];
    rows.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
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
      setSortDir("desc");
    }
  };

  if (!data?.cards) return null;
  const cards = data.cards;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Package} label="Units sold" hint="Net of returns">
          <p className="font-display text-3xl text-ink">
            {Number(cards.unitsSold || 0).toLocaleString("en-PK")}
          </p>
        </KpiCard>
        <KpiCard icon={CircleDollarSign} label="Revenue" hint="Net of returns · sale date">
          <p className="font-display text-3xl text-ink">
            {formatCurrency(cards.revenue)}
          </p>
        </KpiCard>
        <KpiCard label="Gross / returns">
          <p className="font-display text-2xl text-ink">
            {formatCurrency(cards.gross)}
          </p>
          <p className="mt-1 text-sm text-danger">
            Returns {formatCurrency(cards.returns)}
          </p>
        </KpiCard>
        <KpiCard label="Receipts">
          <p className="font-display text-3xl text-ink">
            {Number(cards.salesCount || 0).toLocaleString("en-PK")}
          </p>
          <p className="mt-1 text-sm text-muted">
            Collected {formatCurrency(cards.collected)}
          </p>
        </KpiCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Sales trend" subtitle="Inventory net revenue">
          {(data.charts?.trend || []).length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted">
              No sales in this period.
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
                  name="Revenue"
                  stroke={CHART_COLORS.inventory}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="By category" subtitle="Line revenue">
          {(data.charts?.byCategory || []).length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted">
              No category breakdown.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e2da" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={currencyTick} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill={CHART_COLORS.inventory}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Best sellers" subtitle="Top by revenue">
          <SellerList rows={data.bestSellers} />
        </Panel>
        <Panel title="Slow movers" subtitle="Lowest revenue among sold SKUs">
          <SellerList rows={data.worstSellers} />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Low stock"
          subtitle="At or below minimum threshold"
          actions={
            <AlertTriangle size={16} className="text-danger" aria-hidden />
          }
        >
          {(data.inventoryHealth?.lowStock || []).length === 0 ? (
            <p className="text-sm text-muted">No low-stock alerts.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.inventoryHealth.lowStock.map((i) => (
                <li
                  key={i.id}
                  className="flex justify-between gap-2 border-b border-slate-line/50 pb-2"
                >
                  <div>
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-muted">{i.suggestion}</p>
                  </div>
                  <p className="shrink-0 text-danger">
                    {i.stockLeft} / {i.threshold} {i.unit}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Dead stock" subtitle="No sales in 90 days">
          {(data.inventoryHealth?.deadStock || []).length === 0 ? (
            <p className="text-sm text-muted">No dead-stock items flagged.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.inventoryHealth.deadStock.map((i) => (
                <li
                  key={i.id}
                  className="flex justify-between gap-2 border-b border-slate-line/50 pb-2"
                >
                  <div>
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-muted">{i.suggestion}</p>
                  </div>
                  <p className="shrink-0">
                    {i.stockLeft} {i.unit}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="SKU performance"
        subtitle="Sortable · estimated margin from purchase cost"
        actions={
          <button
            type="button"
            onClick={() =>
              downloadCsv(sorted, `inventory-sales-${Date.now()}.csv`)
            }
            className="rounded-xl border border-slate-line px-3 py-1.5 text-sm font-medium hover:bg-mist"
          >
            Export CSV
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted">
                {[
                  ["sku", "SKU"],
                  ["productName", "Product"],
                  ["qtySold", "Qty"],
                  ["revenue", "Revenue"],
                  ["margin", "Margin"],
                  ["stockLeft", "Stock left"],
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
                  <td colSpan={6} className="py-6 text-muted">
                    No rows for this period.
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr
                    key={String(r.inventoryId)}
                    className="border-t border-slate-line/60"
                  >
                    <td className="py-2.5 pr-3">{r.sku || "—"}</td>
                    <td className="py-2.5 pr-3 font-medium">{r.productName}</td>
                    <td className="py-2.5 pr-3">{r.qtySold}</td>
                    <td className="py-2.5 pr-3">{formatCurrency(r.revenue)}</td>
                    <td className="py-2.5 pr-3">{formatCurrency(r.margin)}</td>
                    <td className="py-2.5 pr-3">{r.stockLeft}</td>
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

function SellerList({ rows }) {
  if (!rows?.length) {
    return <p className="text-sm text-muted">No data.</p>;
  }
  return (
    <ul className="divide-y divide-slate-line/60 text-sm">
      {rows.map((r) => (
        <li
          key={String(r.inventoryId || r.sku || r.productName)}
          className="flex justify-between gap-3 py-2"
        >
          <span className="truncate font-medium">{r.productName}</span>
          <span className="shrink-0">{formatCurrency(r.revenue)}</span>
        </li>
      ))}
    </ul>
  );
}
