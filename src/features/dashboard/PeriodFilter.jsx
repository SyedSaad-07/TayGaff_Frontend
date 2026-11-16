import { toInputDate } from "@/shared/lib/format";

const PERIODS = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
  { value: "yearly", label: "This year" },
  { value: "custom", label: "Custom" },
];

export function PeriodFilter({
  period,
  startDate,
  endDate,
  onPeriodChange,
  onStartDateChange,
  onEndDateChange,
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onPeriodChange(item.value)}
            className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              period === item.value
                ? "bg-brass text-white"
                : "border border-slate-line bg-mist text-ink/70 hover:border-brass/50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {period === "custom" ? (
        <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-end">
          <label className="text-xs font-medium text-ink/60">
            From
            <input
              type="date"
              value={startDate}
              max={endDate || toInputDate()}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-line bg-mist px-3 py-2 text-sm sm:w-auto"
            />
          </label>
          <label className="text-xs font-medium text-ink/60">
            To
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={toInputDate()}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-line bg-mist px-3 py-2 text-sm sm:w-auto"
            />
          </label>
          <p className="pb-2 text-xs text-ink/45 sm:block">e.g. last 6 years</p>
        </div>
      ) : null}
    </div>
  );
}
