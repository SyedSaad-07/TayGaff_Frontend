import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { bookingApi } from "@/features/bookings/api";
import { getErrorMessage } from "@/shared/api/client";
import { formatDate } from "@/shared/lib/format";

export function WorkerAssignedItemsPage({ role }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const fn =
        role === "cutter"
          ? bookingApi.listCutterAssignedItems
          : bookingApi.listKarigarAssignedItems;
      const res = await fn(id, {
        page,
        limit: 40,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load assigned items"));
    } finally {
      setLoading(false);
    }
  }, [id, role, page, status, startDate, endDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const backTo = role === "cutter" ? "/cutters" : "/karigars";
  const worker = data?.worker;
  const items = data?.items || [];
  const totals = data?.totals || { items: 0, quantity: 0 };
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={14} />
        Back
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
          Assigned items
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">
          {worker?.name || "Worker"}{" "}
          <span className="text-2xl text-muted">({worker?.code || "…"})</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          {totals.items} items · qty {totals.quantity}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-line px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-line px-3 py-2 text-sm"
        />
        <input
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          placeholder="Status filter"
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
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Booked</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id || row._id} className="border-b border-slate-line/50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/bookings/${row.bookingId}`}
                      className="text-brass-deep hover:underline"
                    >
                      {row.bookingNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {row.itemName || row.itemCode}
                    <span className="block text-xs text-muted">
                      Slip {row.slipNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.quantity}</td>
                  <td className="px-4 py-3">
                    {row.bookingDate ? formatDate(row.bookingDate) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.deliveryDate ? formatDate(row.deliveryDate) : "—"}
                  </td>
                  <td className="px-4 py-3">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length ? (
            <p className="px-4 py-6 text-sm text-muted">No assigned items.</p>
          ) : null}
        </div>
      )}

      <div className="flex justify-between text-sm">
        <span className="text-muted">
          Page {pagination.page} / {pagination.totalPages || 1}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-line px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= (pagination.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-line px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
