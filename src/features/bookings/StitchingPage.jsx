import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bookingApi } from "@/features/bookings/api";
import { useBookingStatusCatalog } from "@/features/bookings/useBookingStatuses";
import { getErrorMessage } from "@/shared/api/client";
import { formatDate } from "@/shared/lib/format";

function safeDate(value) {
  if (!value) return "—";
  try {
    return formatDate(value);
  } catch {
    return "—";
  }
}

const BOARD_CARDS = [
  { key: "newBookings", label: "New bookings", status: "Booking Confirmed" },
  { key: "awaiting", label: "Awaiting stitching", status: "Awaiting Stitching" },
  { key: "inProgress", label: "Received", status: "Received" },
  { key: "fitting", label: "Fitting / QC", status: "Fitting / Quality Check" },
  { key: "alteration", label: "Alterations", status: "Alteration Required" },
  { key: "ready", label: "Ready for delivery", status: "Ready for Delivery" },
  { key: "overdue", label: "Overdue", status: null, overdue: true },
  {
    key: "recentlyDelivered",
    label: "Delivered (14d)",
    status: "Delivered",
    delivered: true,
  },
];

export function StitchingPage() {
  const { optionsFor } = useBookingStatusCatalog();
  const [board, setBoard] = useState({
    counts: {},
    items: [],
  });
  const [activeKey, setActiveKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updating, setUpdating] = useState("");

  const activeCard = BOARD_CARDS.find((c) => c.key === activeKey) || null;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (activeCard?.overdue) params.overdue = true;
      else if (activeCard?.delivered) params.delivered = true;
      else if (activeCard?.status) params.status = activeCard.status;

      const data = await bookingApi.stitchingBoard(params);
      setBoard(data || { counts: {}, items: [] });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load board"));
    } finally {
      setLoading(false);
    }
  }, [activeCard]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectCard = (card) => {
    setActiveKey((prev) => (prev === card.key ? "" : card.key));
  };

  const clearFilter = () => setActiveKey("");

  const updateLine = async (bookingId, lineId, status) => {
    setUpdating(`${bookingId}:${lineId}`);
    setActionError("");
    try {
      await bookingApi.updateLineStatus(bookingId, lineId, { status });
      await load();
    } catch (err) {
      setActionError(
        getErrorMessage(err, "Status update failed")
      );
    } finally {
      setUpdating("");
    }
  };

  const items = board.items || [];
  const filterLabel = activeCard
    ? activeCard.label
    : "All open stitching orders";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
          Production
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">Stitching board</h1>
        <p className="mt-1 text-sm text-muted">
          Track active orders by stage. Production status is separate from payment.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {BOARD_CARDS.map((card) => {
          const selected = activeKey === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => selectCard(card)}
              className={`rounded-2xl border px-3 py-3 text-left transition ${
                selected
                  ? "border-brass bg-brass/10"
                  : "border-slate-line/80 bg-mist/50 hover:border-brass/40"
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-muted">
                {card.label}
              </p>
              <p className="mt-1 font-display text-3xl text-ink">
                {board.counts?.[card.key] ?? 0}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={clearFilter}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            !activeKey
              ? "border-brass bg-brass/10"
              : "border-slate-line"
          }`}
        >
          Show all open
        </button>
        <Link
          to="/bookings"
          className="rounded-lg border border-slate-line px-3 py-1.5 text-sm"
        >
          All bookings
        </Link>
        <span className="text-sm text-muted">
          Showing: {filterLabel}
          {!loading ? ` · ${items.length}` : ""}
        </span>
      </div>

      {error || actionError ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error || actionError}
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-line px-4 py-8 text-center text-sm text-muted">
            No stitching orders in this view.
          </p>
        ) : (
          items.map((b) => {
            const overdue =
              b.deliveryDate &&
              new Date(b.deliveryDate) < new Date() &&
              b.status !== "Delivered" &&
              b.status !== "Cancelled";
            return (
              <article
                key={b._id}
                className="rounded-2xl border border-slate-line/80 bg-white/80 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/bookings/${b._id}`}
                      className="font-display text-xl hover:underline"
                    >
                      {b.folio} · {b.customerName || b.customerCode}
                    </Link>
                    <p className="text-sm text-muted">
                      Due {safeDate(b.deliveryDate)}
                      {overdue ? (
                        <span className="ml-2 font-semibold text-danger">
                          Overdue
                        </span>
                      ) : null}
                      {" · "}
                      {b.paymentStatus}
                    </p>
                  </div>
                  <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium">
                    {b.status}
                  </span>
                </div>

                <ul className="mt-3 space-y-2">
                  {(b.lines || []).map((line) => (
                    <li
                      key={line._id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-line/50 bg-mist/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="text-sm">
                        <p className="font-medium">
                          Slip {line.slipNumber} · {line.itemCode} {line.itemName}
                        </p>
                        <p className="text-xs text-muted">
                          {line.status}
                          {(() => {
                            const code =
                              line.karigar?.code || line.karigarCode || "";
                            const name = line.karigar?.name || "";
                            if (!name && !code) return "";
                            return ` · Karigar ${
                              name && code
                                ? `${name} (${code})`
                                : name || code
                            }`;
                          })()}
                        </p>
                      </div>
                      <select
                        value={line.status}
                        disabled={updating === `${b._id}:${line._id}`}
                        onChange={(e) =>
                          updateLine(b._id, line._id, e.target.value)
                        }
                        className="rounded-lg border border-slate-line bg-white px-2 py-1.5 text-sm"
                      >
                        {optionsFor(line.status).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
