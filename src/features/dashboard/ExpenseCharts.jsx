import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_COLORS, formatCurrency } from "@/shared/lib/format";

export function ExpenseCharts({ trend, categories }) {
  const activeCategories = categories.filter((c) => c.totalAmount > 0);
  const pieData = (activeCategories.length ? activeCategories : categories).map(
    (item) => ({
      name: item.expenseType,
      value: item.totalAmount,
    })
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-line/80 bg-mist/80 p-5">
        <h3 className="font-display text-2xl text-ink">Spend over time</h3>
        <p className="mt-1 text-sm text-ink/50">Trend for the selected period</p>
        <div className="mt-4 h-72">
          {trend.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b5bdb" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b5bdb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#d5dbe5" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9aa3b2" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9aa3b2" />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#d5dbe5",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalAmount"
                  stroke="#2f4ac0"
                  fill="url(#spendFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-line/80 bg-mist/80 p-5">
        <h3 className="font-display text-2xl text-ink">Category mix</h3>
        <p className="mt-1 text-sm text-ink/50">Share of spend by expense type</p>
        <div className="mt-4 h-72">
          {activeCategories.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={CATEGORY_COLORS[entry.name] || "#6b7280"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#d5dbe5",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-line/80 bg-mist/80 p-5 xl:col-span-2">
        <h3 className="font-display text-2xl text-ink">Category comparison</h3>
        <p className="mt-1 text-sm text-ink/50">Absolute totals side by side</p>
        <div className="mt-4 h-80">
          {activeCategories.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeCategories}>
                <CartesianGrid stroke="#d5dbe5" strokeDasharray="3 3" />
                <XAxis
                  dataKey="expenseType"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={70}
                  stroke="#9aa3b2"
                />
                <YAxis tick={{ fontSize: 11 }} stroke="#9aa3b2" />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#d5dbe5",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="totalAmount" radius={[8, 8, 0, 0]}>
                  {activeCategories.map((entry) => (
                    <Cell
                      key={entry.expenseType}
                      fill={CATEGORY_COLORS[entry.expenseType] || "#6b7280"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-line text-sm text-ink/40">
      No expense data for this range
    </div>
  );
}
