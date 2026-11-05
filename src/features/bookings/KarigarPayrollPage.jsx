import { Fragment, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { bookingApi } from "@/features/bookings/api";
import { useAuth } from "@/features/auth/AuthContext";
import { isAdmin } from "@/features/auth/roles";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { TENDER_METHODS } from "@/shared/constants";
import { getErrorMessage } from "@/shared/api/client";
import { formatCurrency, formatDate, toInputDate } from "@/shared/lib/format";

const emptyPayForm = () => ({
  amount: "",
  method: "Cash",
  reference: "",
  notes: "",
  paidAt: toInputDate(new Date()),
});

export function KarigarPayrollPage() {
  const { user } = useAuth();
  const admin = isAdmin(user);

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({
    openPieces: 0,
    openAmount: 0,
    paidTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [payBusy, setPayBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await bookingApi.listKarigarPayroll();
      setRows(Array.isArray(data?.items) ? data.items : []);
      setTotals(data?.totals || { openPieces: 0, openAmount: 0, paidTotal: 0 });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load karigar work"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadDetail = useCallback(async (karigarId) => {
    setDetailBusy(true);
    setError("");
    try {
      const data = await bookingApi.getKarigarPayroll(karigarId);
      setDetail(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load karigar detail"));
      setDetail(null);
    } finally {
      setDetailBusy(false);
    }
  }, []);

  const toggleExpand = async (karigarId) => {
    if (expandedId === karigarId) {
      setExpandedId(null);
      setDetail(null);
      setPayForm(emptyPayForm());
      return;
    }
    setExpandedId(karigarId);
    setPayForm(emptyPayForm());
    await loadDetail(karigarId);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!expandedId) return;
    const amount = Number(payForm.amount);
    if (!(amount > 0)) {
      setError("Enter a payment amount greater than 0");
      return;
    }
    setPayBusy(true);
    setError("");
    try {
      await bookingApi.createKarigarPayment(expandedId, {
        amount,
        method: payForm.method,
        reference: payForm.reference.trim(),
        notes: payForm.notes.trim(),
        paidAt: payForm.paidAt || undefined,
      });
      setPayForm(emptyPayForm());
      await Promise.all([loadList(), loadDetail(expandedId)]);
    } catch (err) {
      setError(getErrorMessage(err, "Could not record payment"));
    } finally {
      setPayBusy(false);
    }
  };

  const confirmDeletePayment = async () => {
    if (!deleteTarget?._id || !expandedId) return;
    setDeleteBusy(true);
    setError("");
    try {
      await bookingApi.deleteKarigarPayment(expandedId, deleteTarget._id);
      setDeleteTarget(null);
      await Promise.all([loadList(), loadDetail(expandedId)]);
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete payment"));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Tailoring · Payroll
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            Karigar work &amp; payments
          </h1>
          <p className="mt-1 text-sm text-muted">
            Open cloths per karigar at their garment rates, and payment records.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadList()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-brass/50 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </button>
      </div>

      {error ? (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-line/80 bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Open cloths
          </p>
          <p className="mt-1 font-display text-3xl text-ink">
            {totals.openPieces}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-line/80 bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Amount to pay (open)
          </p>
          <p className="mt-1 font-display text-3xl text-ink">
            {formatCurrency(totals.openAmount)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-line/80 bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Paid to date
          </p>
          <p className="mt-1 font-display text-3xl text-ink">
            {formatCurrency(totals.paidTotal)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-line/80 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-mist/80 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Karigar</th>
                <th className="px-4 py-3 font-medium">Open cloths</th>
                <th className="px-4 py-3 font-medium">To pay (open)</th>
                <th className="px-4 py-3 font-medium">Paid to date</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading && !rows.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    <Loader2 className="mx-auto animate-spin" size={20} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    No active karigars.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const kid = row.karigar?._id || row.karigar?.id;
                  const open = expandedId === kid;
                  return (
                    <Fragment key={kid}>
                      <tr className="border-t border-slate-line/70 align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">
                            {row.karigar?.name || "—"}
                          </p>
                          <p className="text-xs text-muted">
                            {row.karigar?.code || ""}
                            {row.missingRatePieces
                              ? ` · ${row.missingRatePieces} without rate`
                              : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">
                          {row.openPieces}
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">
                          {formatCurrency(row.openAmount)}
                        </td>
                        <td className="px-4 py-3 text-ink/80">
                          {formatCurrency(row.paidTotal)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void toggleExpand(kid)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-brass/50"
                          >
                            {open ? (
                              <>
                                Hide <ChevronUp size={14} />
                              </>
                            ) : (
                              <>
                                Details <ChevronDown size={14} />
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="border-t border-slate-line/60 bg-mist/40">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="space-y-5">
                              {detailBusy && !detail ? (
                                <p className="flex items-center gap-2 text-sm text-muted">
                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />{" "}
                                  Loading detail…
                                </p>
                              ) : null}

                              {detail ? (
                                <>
                                  <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="space-y-2">
                                      <h3 className="text-sm font-semibold text-ink">
                                        By garment (open)
                                      </h3>
                                      {(detail.byGarment || []).length ===
                                      0 ? (
                                        <p className="text-sm text-muted">
                                          No open cloths.
                                        </p>
                                      ) : (
                                        <ul className="space-y-1.5 text-sm">
                                          {detail.byGarment.map((g) => (
                                            <li
                                              key={`${g.itemCode}-${g.itemName}`}
                                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-line/70 bg-white px-3 py-2"
                                            >
                                              <span>
                                                <span className="font-medium text-ink">
                                                  {g.itemName}
                                                </span>
                                                <span className="text-muted">
                                                  {" "}
                                                  · {g.pieces} ×{" "}
                                                  {formatCurrency(g.rate)}
                                                  {g.missingRate
                                                    ? " (no rate)"
                                                    : ""}
                                                </span>
                                              </span>
                                              <span className="font-medium text-ink">
                                                {formatCurrency(g.amount)}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>

                                    <div className="space-y-2">
                                      <h3 className="text-sm font-semibold text-ink">
                                        Record payment
                                      </h3>
                                      <form
                                        onSubmit={submitPayment}
                                        className="space-y-3 rounded-xl border border-slate-line/70 bg-white p-3"
                                      >
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <label className="text-xs font-medium text-ink/60">
                                            Amount
                                            <input
                                              required
                                              type="number"
                                              min="0.01"
                                              step="0.01"
                                              value={payForm.amount}
                                              onChange={(e) =>
                                                setPayForm((p) => ({
                                                  ...p,
                                                  amount: e.target.value,
                                                }))
                                              }
                                              className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                                            />
                                          </label>
                                          <label className="text-xs font-medium text-ink/60">
                                            Method
                                            <select
                                              value={payForm.method}
                                              onChange={(e) =>
                                                setPayForm((p) => ({
                                                  ...p,
                                                  method: e.target.value,
                                                }))
                                              }
                                              className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                                            >
                                              {TENDER_METHODS.map((m) => (
                                                <option key={m} value={m}>
                                                  {m}
                                                </option>
                                              ))}
                                            </select>
                                          </label>
                                          <label className="text-xs font-medium text-ink/60">
                                            Date
                                            <input
                                              type="date"
                                              value={payForm.paidAt}
                                              onChange={(e) =>
                                                setPayForm((p) => ({
                                                  ...p,
                                                  paidAt: e.target.value,
                                                }))
                                              }
                                              className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                                            />
                                          </label>
                                          <label className="text-xs font-medium text-ink/60">
                                            Reference
                                            <input
                                              value={payForm.reference}
                                              onChange={(e) =>
                                                setPayForm((p) => ({
                                                  ...p,
                                                  reference: e.target.value,
                                                }))
                                              }
                                              className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                                              placeholder="Optional"
                                            />
                                          </label>
                                        </div>
                                        <label className="block text-xs font-medium text-ink/60">
                                          Note
                                          <input
                                            value={payForm.notes}
                                            onChange={(e) =>
                                              setPayForm((p) => ({
                                                ...p,
                                                notes: e.target.value,
                                              }))
                                            }
                                            className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                                            placeholder="Optional"
                                          />
                                        </label>
                                        <button
                                          type="submit"
                                          disabled={payBusy}
                                          className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white hover:bg-brass-deep disabled:opacity-50"
                                        >
                                          {payBusy ? (
                                            <Loader2
                                              size={16}
                                              className="animate-spin"
                                            />
                                          ) : (
                                            <Wallet size={16} />
                                          )}
                                          Save payment
                                        </button>
                                      </form>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-ink">
                                      Open slips
                                    </h3>
                                    {(detail.openSlips || []).length === 0 ? (
                                      <p className="text-sm text-muted">
                                        None.
                                      </p>
                                    ) : (
                                      <div className="overflow-x-auto rounded-xl border border-slate-line/70 bg-white">
                                        <table className="min-w-full text-left text-xs">
                                          <thead className="bg-mist/60 text-muted">
                                            <tr>
                                              <th className="px-3 py-2 font-medium">
                                                Booking
                                              </th>
                                              <th className="px-3 py-2 font-medium">
                                                Slip
                                              </th>
                                              <th className="px-3 py-2 font-medium">
                                                Garment
                                              </th>
                                              <th className="px-3 py-2 font-medium">
                                                Qty
                                              </th>
                                              <th className="px-3 py-2 font-medium">
                                                Rate
                                              </th>
                                              <th className="px-3 py-2 font-medium">
                                                Amount
                                              </th>
                                              <th className="px-3 py-2 font-medium">
                                                Status
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {detail.openSlips.map((s) => (
                                              <tr
                                                key={s._id || s.id}
                                                className="border-t border-slate-line/60"
                                              >
                                                <td className="px-3 py-2">
                                                  {s.booking?._id ||
                                                  s.booking?.id ? (
                                                    <Link
                                                      to={`/bookings/${s.booking._id || s.booking.id}`}
                                                      className="text-brass-deep underline"
                                                    >
                                                      {
                                                        s.booking
                                                          .bookingNumber
                                                      }
                                                    </Link>
                                                  ) : (
                                                    "—"
                                                  )}
                                                </td>
                                                <td className="px-3 py-2 font-mono">
                                                  {s.slipNumber}
                                                </td>
                                                <td className="px-3 py-2">
                                                  {s.itemName}
                                                </td>
                                                <td className="px-3 py-2">
                                                  {s.quantity}
                                                </td>
                                                <td className="px-3 py-2">
                                                  {s.missingRate
                                                    ? "—"
                                                    : formatCurrency(s.rate)}
                                                </td>
                                                <td className="px-3 py-2">
                                                  {formatCurrency(s.amount)}
                                                </td>
                                                <td className="px-3 py-2">
                                                  {s.status}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-ink">
                                      Payment history
                                    </h3>
                                    {(detail.recentPayments || []).length ===
                                    0 ? (
                                      <p className="text-sm text-muted">
                                        No payments recorded yet.
                                      </p>
                                    ) : (
                                      <ul className="space-y-1.5">
                                        {detail.recentPayments.map((p) => (
                                          <li
                                            key={p._id || p.id}
                                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-line/70 bg-white px-3 py-2 text-sm"
                                          >
                                            <div>
                                              <p className="font-medium text-ink">
                                                {formatCurrency(p.amount)} ·{" "}
                                                {p.method}
                                              </p>
                                              <p className="text-xs text-muted">
                                                {formatDate(p.paidAt)}
                                                {p.notes
                                                  ? ` · ${p.notes}`
                                                  : ""}
                                                {p.reference
                                                  ? ` · Ref ${p.reference}`
                                                  : ""}
                                              </p>
                                            </div>
                                            {admin ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setDeleteTarget(p)
                                                }
                                                className="text-xs font-semibold text-danger hover:underline"
                                              >
                                                Delete
                                              </button>
                                            ) : null}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this payment?"
        message="The payment record will be removed from the karigar ledger."
        confirmLabel="Delete payment"
        tone="danger"
        busy={deleteBusy}
        onConfirm={() => void confirmDeletePayment()}
        onCancel={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
