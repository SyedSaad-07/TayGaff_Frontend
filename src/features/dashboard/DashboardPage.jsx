import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { expenseApi } from "@/features/expenses/api";
import { PeriodFilter } from "@/features/dashboard/PeriodFilter";
import { StatsCards } from "@/features/dashboard/StatsCards";
import { ExpenseCharts } from "@/features/dashboard/ExpenseCharts";
import { CategoryBreakdownTable } from "@/features/dashboard/CategoryBreakdownTable";
import { useBranch } from "@/features/branches/BranchContext";
import { ALL_BRANCHES } from "@/features/branches/branchUtils";
import { toInputDate } from "@/shared/lib/format";
import { EXPENSE_TYPES } from "@/shared/constants";
import { getErrorMessage } from "@/shared/api/client";

export function DashboardPage() {
  const { selectedBranchId, selectedBranch, isAllBranches, branches, loading: branchesLoading } =
    useBranch();
  const [period, setPeriod] = useState("monthly");
  const [expenseType, setExpenseType] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 6);
    return toInputDate(d);
  });
  const [endDate, setEndDate] = useState(toInputDate());
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    if (branchesLoading) return;

    if (!branches.length) {
      setStats(null);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await expenseApi.stats({
        period,
        startDate: period === "custom" ? startDate : undefined,
        endDate: period === "custom" ? endDate : undefined,
        branchId: selectedBranchId || ALL_BRANCHES,
        expenseType: expenseType || undefined,
      });
      setStats(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load stats"));
    } finally {
      setLoading(false);
    }
  }, [
    period,
    startDate,
    endDate,
    selectedBranchId,
    expenseType,
    branches.length,
    branchesLoading,
  ]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const scopeLabel = isAllBranches
    ? "All branches statistics"
    : selectedBranch?.name || "Selected branch";
  const typeLabel = expenseType || "All expense types";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Overview · {scopeLabel} · {typeLabel}
          </p>
          <h1 className="mt-1 font-display text-4xl text-ink sm:text-5xl">
            Expense reports
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink/55">
            Monitor shop spend by day, week, month, year, or any custom window —
            filtered by branch and expense type.
          </p>
        </div>
        <Link
          to="/expenses"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brass px-4 py-3 text-sm font-semibold text-white transition hover:bg-brass-deep"
        >
          <Plus size={16} />
          Add expense
        </Link>
      </div>

      {!branchesLoading && !branches.length ? (
        <div className="rounded-2xl border border-dashed border-slate-line bg-mist/80 p-6 text-sm text-ink/60">
          Create a branch first to start tracking expenses.{" "}
          <Link to="/branches" className="font-semibold text-brass-deep underline">
            Go to Branches
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <PeriodFilter
          period={period}
          startDate={startDate}
          endDate={endDate}
          onPeriodChange={setPeriod}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
        <label className="text-xs font-medium text-ink/60">
          Filter by type
          <select
            value={expenseType}
            onChange={(e) => setExpenseType(e.target.value)}
            className="mt-1 block min-w-[12rem] rounded-xl border border-slate-line bg-mist px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            {EXPENSE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      {loading && !stats ? (
        <p className="text-sm text-ink/50">Loading statistics…</p>
      ) : stats ? (
        <>
          <StatsCards summary={stats.summary} />
          <ExpenseCharts trend={stats.trend} categories={stats.categoryBreakdown} />
          <CategoryBreakdownTable categories={stats.categoryBreakdown} />
        </>
      ) : null}
    </div>
  );
}
