import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Package,
  Users,
  Truck,
  Wallet,
  TrendingUp,
  CalendarClock,
  Scissors,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/shared/lib/format";
import {
  ChartCard,
  CHART_COLORS,
  currencyTick,
  GrowthBadge,
  KpiCard,
  Panel,
} from "@/features/overview/dashboardUi";

export function OverviewTab({ data, stream, compare = true }) {
  const cards = data?.cards;
  const charts = data?.charts;
  if (!cards) return null;

  const showInv = stream !== "bookings";
  const showBook = stream !== "inventory";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <KpiCard
          icon={TrendingUp}
          label="Total revenue"
          hint="Inventory net sales + booking order totals"
        >
          <p className="font-display text-3xl text-ink">
            {formatCurrency(cards.totalRevenue)}
          </p>
          {compare ? (
            <div className="mt-2">
              <GrowthBadge value={cards.growthPct} />
            </div>
          ) : null}
        </KpiCard>

        {showInv ? (
          <KpiCard
            icon={ShoppingBag}
            label="Inventory revenue"
            hint="Sale date · net of returns"
          >
            <p className="font-display text-3xl text-ink">
              {formatCurrency(cards.inventoryRevenue)}
            </p>
            {cards.inventoryReturns > 0 ? (
              <p className="mt-1 text-sm text-danger">
                Returns {formatCurrency(cards.inventoryReturns)}
              </p>
            ) : null}
          </KpiCard>
        ) : null}

        {showBook ? (
          <KpiCard
            icon={Scissors}
            label="Booking revenue"
            hint="Cash collected on payment date"
          >
            <p className="font-display text-3xl text-ink">
              {formatCurrency(cards.bookingRevenue)}
            </p>
            <p className="mt-1 text-sm text-ink/70">
              {Number(cards.bookingsCount || 0).toLocaleString()} bookings created
            </p>
          </KpiCard>
        ) : null}

        <KpiCard
          icon={Wallet}
          label="Outstanding"
          hint="Open balances · inventory + bookings"
        >
          <p className="font-display text-3xl text-ink">
            {formatCurrency(cards.outstandingPayments)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Inv {formatCurrency(cards.outstandingInventory)} · Book{" "}
            {formatCurrency(cards.outstandingBookings)}
          </p>
        </KpiCard>

        <KpiCard icon={CalendarClock} label="Open bookings" hint="Not delivered / cancelled">
          <p className="font-display text-3xl text-ink">
            {Number(cards.openBookings || 0).toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-ink/70">
            Total {Number(cards.totalBookings || 0).toLocaleString()}
          </p>
        </KpiCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={Package} label="Total items" hint="Active inventory products">
          <p className="font-display text-3xl text-ink">
            {Number(cards.totalItems || 0).toLocaleString()}
          </p>
        </KpiCard>
        <KpiCard icon={Users} label="Total customers" hint="Customer master">
          <p className="font-display text-3xl text-ink">
            {Number(cards.totalCustomers || 0).toLocaleString()}
          </p>
        </KpiCard>
        <KpiCard icon={Truck} label="Total suppliers" hint="Active suppliers">
          <p className="font-display text-3xl text-ink">
            {Number(cards.totalSuppliers || 0).toLocaleString()}
          </p>
        </KpiCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Revenue split"
          subtitle="Inventory vs bookings (selected period)"
          className="xl:col-span-1"
        >
          {(charts?.revenueSplit || []).every((r) => !r.value) ? (
            <p className="flex h-full items-center justify-center text-sm text-muted">
              No revenue in this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.revenueSplit.filter((r) => r.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {(charts.revenueSplit || []).map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === "Inventory"
                          ? CHART_COLORS.inventory
                          : CHART_COLORS.bookings
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Revenue trend"
          subtitle="Stacked inventory + booking collections"
          className="xl:col-span-2"
        >
          {(charts?.stackedTrend || []).length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted">
              No trend data for this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.stackedTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e2da" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={currencyTick} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                {showInv ? (
                  <Area
                    type="monotone"
                    dataKey="inventory"
                    name="Inventory"
                    stackId="1"
                    stroke={CHART_COLORS.inventory}
                    fill={`${CHART_COLORS.inventory}55`}
                  />
                ) : null}
                {showBook ? (
                  <Area
                    type="monotone"
                    dataKey="bookings"
                    name="Bookings"
                    stackId="1"
                    stroke={CHART_COLORS.bookings}
                    fill={`${CHART_COLORS.bookings}55`}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {showInv ? (
          <Panel
            title="Top products"
            subtitle="By inventory revenue"
            actions={
              <Link
                to="/inventory/sales"
                className="text-sm font-semibold text-brass-deep hover:underline"
              >
                Sales history
              </Link>
            }
          >
            {(data.topProducts || []).length === 0 ? (
              <p className="text-sm text-muted">No product sales in this period.</p>
            ) : (
              <ul className="divide-y divide-slate-line/60">
                {data.topProducts.map((p) => (
                  <li
                    key={`${p.sku}-${p.name}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{p.name}</p>
                      <p className="text-xs text-muted">
                        {p.sku || "—"} · Qty {p.qtySold}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">
                      {formatCurrency(p.revenue)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

        {showBook ? (
          <Panel
            title="Top services"
            subtitle="By booking order value"
            actions={
              <Link
                to="/bookings"
                className="text-sm font-semibold text-brass-deep hover:underline"
              >
                Bookings
              </Link>
            }
          >
            {(data.topServices || []).length === 0 ? (
              <p className="text-sm text-muted">No booking lines in this period.</p>
            ) : (
              <ul className="divide-y divide-slate-line/60">
                {data.topServices.map((s) => (
                  <li
                    key={`${s.code}-${s.name}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{s.name}</p>
                      <p className="text-xs text-muted">
                        {s.code} · {s.bookingCount} bookings · Qty {s.qty}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">
                      {formatCurrency(s.revenue)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}
      </div>

      {data.rules ? (
        <p className="text-xs text-muted">
          Recognition: inventory on {data.rules.inventory}; bookings on{" "}
          {data.rules.bookings}. {data.rules.identity}. Currency {data.rules.currency} ·{" "}
          {data.rules.timezone}.
        </p>
      ) : null}
    </div>
  );
}
