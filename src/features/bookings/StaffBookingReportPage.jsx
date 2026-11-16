import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bookingApi } from "@/features/bookings/api";
import { getErrorMessage } from "@/shared/api/client";

export function StaffBookingReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await bookingApi.staffBookingReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setRows(data.rows || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load report"));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
          Admin report
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">Bookings by staff</h1>
        <p className="mt-2 text-sm text-muted">
          Who created how many bookings in the selected date range.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-xl border border-slate-line px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-xl border border-slate-line px-3 py-2 text-sm"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-line text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const staffId = row.createdById || "legacy";
                const qs = new URLSearchParams();
                qs.set("createdById", staffId);
                if (startDate) qs.set("startDate", startDate);
                if (endDate) qs.set("endDate", endDate);
                return (
                  <tr key={staffId} className="border-b border-slate-line/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.name}</p>
                      {row.email ? (
                        <p className="text-xs text-muted">{row.email}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-semibold">{row.count}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/bookings?createdById=${encodeURIComponent(staffId)}`}
                        className="text-brass-deep hover:underline"
                      >
                        View list
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length ? (
            <p className="px-4 py-6 text-sm text-muted">No bookings in range.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
