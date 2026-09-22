import { CATEGORY_COLORS, formatCurrency } from "@/shared/lib/format";

export function CategoryBreakdownTable({ categories }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-line/80 bg-mist/80">
      <div className="border-b border-slate-line/80 px-5 py-4">
        <h3 className="font-display text-2xl text-ink">Category breakdown</h3>
        <p className="mt-1 text-sm text-ink/50">
          Every expense type with totals, counts, and share
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-canvas/80 text-xs uppercase tracking-wide text-ink/45">
            <tr>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Count</th>
              <th className="px-5 py-3 font-medium">Avg</th>
              <th className="px-5 py-3 font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((row) => (
              <tr key={row.expenseType} className="border-t border-slate-line/70">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[row.expenseType] || "#6b7280",
                      }}
                    />
                    {row.expenseType}
                  </div>
                </td>
                <td className="px-5 py-3 font-medium">
                  {formatCurrency(row.totalAmount)}
                </td>
                <td className="px-5 py-3 text-ink/70">{row.count}</td>
                <td className="px-5 py-3 text-ink/70">
                  {formatCurrency(row.averageAmount || 0)}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-line">
                      <div
                        className="h-full rounded-full bg-brass"
                        style={{ width: `${Math.min(row.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink/55">{row.percentage}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
