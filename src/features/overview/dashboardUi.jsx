export function KpiCard({ icon: Icon, label, children, hint }) {
  return (
    <div className="rounded-2xl border border-slate-line/80 bg-mist/80 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            {label}
          </p>
          <div className="mt-2">{children}</div>
          {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brass/10 text-brass">
            <Icon size={18} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-line/80 bg-white/80 p-5 ${className}`}
    >
      <div className="mb-4">
        <h2 className="font-display text-2xl text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      <div className="h-72 w-full">{children}</div>
    </section>
  );
}

export function Panel({ title, subtitle, children, actions }) {
  return (
    <section className="rounded-2xl border border-slate-line/80 bg-white/80 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function GrowthBadge({ value }) {
  const n = Number(value) || 0;
  const up = n >= 0;
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${
        up ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
      }`}
    >
      {up ? "+" : ""}
      {n}% vs prior
    </span>
  );
}

export const currencyTick = (value) =>
  Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 });

export const CHART_COLORS = {
  inventory: "#3b5bdb",
  bookings: "#1c2b46",
  total: "#2f6b4f",
  muted: "#d9e0ec",
  danger: "#9b3d3d",
};
