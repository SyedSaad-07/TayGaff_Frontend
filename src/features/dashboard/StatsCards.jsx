import { TrendingDown, TrendingUp, Wallet, Hash, ChartNoAxesCombined } from "lucide-react";
import { formatCurrency } from "@/shared/lib/format";

export function StatsCards({ summary }) {
  const isUp = summary.changePercent >= 0;

  const cards = [
    {
      label: "Total spend",
      value: formatCurrency(summary.totalAmount),
      icon: Wallet,
      hint: `${isUp ? "+" : ""}${summary.changePercent}% vs prior period`,
      tone: isUp ? "text-danger" : "text-success",
      trendIcon: isUp ? TrendingUp : TrendingDown,
    },
    {
      label: "Transactions",
      value: String(summary.count),
      icon: Hash,
      hint: "Expense entries in range",
      tone: "text-muted",
    },
    {
      label: "Average ticket",
      value: formatCurrency(summary.averageAmount),
      icon: ChartNoAxesCombined,
      hint: `Max ${formatCurrency(summary.maxAmount)}`,
      tone: "text-muted",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className="rounded-2xl border border-slate-line/80 bg-mist/80 p-5 shadow-[0_10px_30px_-24px_rgba(18,24,32,0.45)] animate-[fadeUp_0.5s_ease-out]"
          style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
        >
          <div className="flex items-start justify-between">
            <p className="text-sm text-ink/55">{card.label}</p>
            <div className="rounded-lg bg-brass/10 p-2 text-brass">
              <card.icon size={16} />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl text-ink">{card.value}</p>
          <p className={`mt-2 inline-flex items-center gap-1 text-xs ${card.tone}`}>
            {card.trendIcon ? <card.trendIcon size={13} /> : null}
            {card.hint}
          </p>
        </div>
      ))}
    </div>
  );
}
