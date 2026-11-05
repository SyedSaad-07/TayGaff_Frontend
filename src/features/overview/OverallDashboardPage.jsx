import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { overviewApi } from "@/features/overview/api";
import { PeriodFilter } from "@/features/dashboard/PeriodFilter";
import { OverviewTab } from "@/features/overview/OverviewTab";
import { InventoryTab } from "@/features/overview/InventoryTab";
import { BookingsTab } from "@/features/overview/BookingsTab";
import { useBranch } from "@/features/branches/BranchContext";
import { ALL_BRANCHES } from "@/features/branches/branchUtils";
import { getErrorMessage } from "@/shared/api/client";
import { toInputDate } from "@/shared/lib/format";

const VIEWS = [
  { id: "overview", label: "Overview" },
  { id: "inventory", label: "Inventory sales" },
  { id: "bookings", label: "Booking revenue" },
];

const STREAMS = [
  { id: "all", label: "All" },
  { id: "inventory", label: "Inventory" },
  { id: "bookings", label: "Bookings" },
];

export function OverallDashboardPage() {
  const {
    selectedBranchId,
    selectedBranch,
    isAllBranches,
    branches,
    loading: branchesLoading,
  } = useBranch();

  const [view, setView] = useState("overview");
  const [stream, setStream] = useState("all");
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return toInputDate(d);
  });
  const [endDate, setEndDate] = useState(toInputDate());
  const [compare, setCompare] = useState(true);

  const [overview, setOverview] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryParams = useCallback(() => {
    return {
      period,
      startDate: period === "custom" ? startDate : undefined,
      endDate: period === "custom" ? endDate : undefined,
      branchId: selectedBranchId || ALL_BRANCHES,
      stream,
    };
  }, [period, startDate, endDate, selectedBranchId, stream]);

  const load = useCallback(async () => {
    if (branchesLoading) return;
    if (!branches.length) {
      setOverview(null);
      setInventory(null);
      setBookings(null);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    const params = queryParams();

    try {
      if (view === "overview") {
        const result = await overviewApi.dashboard(params);
        setOverview(result);
      } else if (view === "inventory") {
        const result = await overviewApi.inventory(params);
        setInventory(result);
      } else {
        const result = await overviewApi.bookings(params);
        setBookings(result);
      }
    } catch (err) {
      setError(
        getErrorMessage(err, "Failed to load dashboard")
      );
    } finally {
      setLoading(false);
    }
  }, [branches.length, branchesLoading, queryParams, view]);

  useEffect(() => {
    void load();
  }, [load]);

  // When stream filter changes on inventory/bookings tabs, jump to overview
  // only if stream narrows — inventory/bookings views ignore stream for detail.
  useEffect(() => {
    if (stream === "inventory" && view === "bookings") setView("inventory");
    if (stream === "bookings" && view === "inventory") setView("bookings");
  }, [stream, view]);

  const scopeLabel = isAllBranches
    ? "All branches"
    : selectedBranch?.name || "Selected branch";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Business · {scopeLabel}
          </p>
          <h1 className="mt-1 font-display text-4xl text-ink sm:text-5xl">
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/55">
            Combined inventory sales and booking collections — PKR · Asia/Karachi.
            {compare ? " Growth compares to the previous equal period." : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/inventory/pos"
            className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-3 text-sm font-semibold text-white"
          >
            New sale
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/bookings"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-line px-4 py-3 text-sm font-medium"
          >
            New booking
          </Link>
        </div>
      </div>

      <PeriodFilter
        period={period}
        onPeriodChange={setPeriod}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                view === v.id
                  ? "bg-ink text-white"
                  : "border border-slate-line bg-mist text-ink/70 hover:border-brass/50"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Stream
          </span>
          {STREAMS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStream(s.id)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                stream === s.id
                  ? "bg-brass/15 text-brass-deep"
                  : "text-ink/60 hover:bg-mist"
              }`}
            >
              {s.label}
            </button>
          ))}
          <label className="ml-2 inline-flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              className="rounded border-slate-line"
            />
            Compare prior period
          </label>
        </div>
      </div>

      {!branchesLoading && !branches.length ? (
        <div className="rounded-2xl border border-dashed border-slate-line bg-mist/80 p-6 text-sm text-ink/60">
          Create a branch to see business metrics.{" "}
          <Link to="/branches" className="font-semibold text-brass-deep underline">
            Manage branches
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading dashboard…</p>
      ) : (
        <>
          {view === "overview" && overview ? (
            <OverviewTab data={overview} stream={stream} compare={compare} />
          ) : null}
          {view === "inventory" && inventory ? (
            <InventoryTab data={inventory} />
          ) : null}
          {view === "bookings" && bookings ? (
            <BookingsTab data={bookings} />
          ) : null}
        </>
      )}
    </div>
  );
}
