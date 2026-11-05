import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Link2, Pencil, Banknote, RotateCcw, Trash2 } from "lucide-react";
import { salesApi } from "@/features/sales/api";
import { ReceiptPreview } from "@/features/sales/ReceiptPreview";
import { useBranch } from "@/features/branches/BranchContext";
import { ALL_BRANCHES } from "@/features/branches/branchUtils";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { TENDER_METHODS, REFUND_STATUSES } from "@/shared/constants";
import { getErrorMessage } from "@/shared/api/client";
import { formatCurrency, formatDate, toInputDate } from "@/shared/lib/format";

function remainingQty(item) {
  return Math.max(0, Number(item.quantity || 0) - Number(item.returnedQuantity || 0));
}

export function SalesHistoryPage() {
  const { selectedBranchId } = useBranch();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [saleStatus, setSaleStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [stream, setStream] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState("");
  const [panel, setPanel] = useState(null); // "payment" | "return" | null
  const [saving, setSaving] = useState(false);
  /** @type {[{ type: 'delete'|'cancel'|'return', sale: object } | null, Function]} */
  const [confirm, setConfirm] = useState(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [payForm, setPayForm] = useState({
    amount: "",
    method: "Cash",
    reference: "",
    notes: "",
  });

  const [returnForm, setReturnForm] = useState({
    reason: "",
    refundStatus: "Pending",
    lines: {},
  });

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await salesApi.list({
        page,
        limit: 15,
        search,
        paymentStatus: paymentStatus || undefined,
        saleStatus: saleStatus || undefined,
        paymentMethod: paymentMethod || undefined,
        stream: stream || "ALL",
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        branchId: selectedBranchId || ALL_BRANCHES,
      });
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load sales"));
    } finally {
      setLoading(false);
    }
  }, [
    page,
    search,
    paymentStatus,
    saleStatus,
    paymentMethod,
    stream,
    startDate,
    endDate,
    selectedBranchId,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const openSale = async (id) => {
    setActionError("");
    setPanel(null);
    try {
      const sale = await salesApi.getById(id);
      setSelected(sale);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to open sale"));
    }
  };

  const askCancelSale = () => {
    if (!selected) return;
    setConfirmReason("");
    setConfirm({ type: "cancel", sale: selected });
  };

  const askDeleteSale = (sale = selected) => {
    if (!sale) return;
    if (sale.saleStatus === "Returned") {
      setError("Fully returned sales cannot be deleted from here.");
      return;
    }
    setConfirmReason("");
    setConfirm({ type: "delete", sale });
  };

  const askReturnConfirm = () => {
    if (!selected) return;
    setConfirmReason("");
    setConfirm({ type: "return", sale: selected });
  };

  const closeConfirm = () => {
    if (confirmBusy) return;
    setConfirm(null);
    setConfirmReason("");
  };

  const runConfirm = async () => {
    if (!confirm?.sale) return;
    setConfirmBusy(true);
    setError("");
    setActionError("");
    try {
      if (confirm.type === "delete") {
        await salesApi.remove(confirm.sale._id, { reason: confirmReason.trim() });
        if (selected?._id === confirm.sale._id) {
          setSelected(null);
          setPanel(null);
        }
        setConfirm(null);
        setConfirmReason("");
        await load();
      } else if (confirm.type === "cancel") {
        const sale = await salesApi.cancel(confirm.sale._id, {
          reason: confirmReason.trim(),
        });
        setSelected(sale);
        setConfirm(null);
        setConfirmReason("");
        await load();
      } else if (confirm.type === "return") {
        const items = Object.entries(returnForm.lines)
          .map(([itemId, row]) => ({
            itemId,
            quantity: Number(row.quantity),
            restock: row.restock !== false,
          }))
          .filter((row) => row.quantity > 0);
        if (!items.length) {
          setActionError("Enter a return quantity for at least one item");
          setConfirm(null);
          return;
        }
        const sale = await salesApi.returnItems(confirm.sale._id, {
          items,
          reason: returnForm.reason.trim() || confirmReason.trim(),
          refundStatus: returnForm.refundStatus,
        });
        setSelected(sale);
        setPanel(null);
        setConfirm(null);
        setConfirmReason("");
        await load();
      }
    } catch (err) {
      const msg = getErrorMessage(
        err,
        confirm.type === "delete"
          ? "Delete failed"
          : confirm.type === "cancel"
            ? "Cancel failed"
            : "Return failed"
      );
      setError(msg);
      setActionError(msg);
    } finally {
      setConfirmBusy(false);
    }
  };

  const openPaymentPanel = () => {
    if (!selected) return;
    setPayForm({
      amount: String(selected.balanceDue || ""),
      method: "Cash",
      reference: "",
      notes: "",
    });
    setPanel("payment");
    setActionError("");
  };

  const openReturnPanel = () => {
    if (!selected) return;
    const lines = {};
    (selected.items || []).forEach((item) => {
      const rem = remainingQty(item);
      if (rem > 0) {
        lines[item._id] = { quantity: "", restock: true };
      }
    });
    setReturnForm({ reason: "", refundStatus: "Pending", lines });
    setPanel("return");
    setActionError("");
  };

  const submitPayment = async () => {
    if (!selected) return;
    setSaving(true);
    setActionError("");
    try {
      const sale = await salesApi.addPayment(selected._id, {
        amount: Number(payForm.amount),
        method: payForm.method,
        reference: payForm.reference.trim(),
        notes: payForm.notes.trim(),
      });
      setSelected(sale);
      setPanel(null);
      await load();
    } catch (err) {
      setActionError(getErrorMessage(err, "Payment failed"));
    } finally {
      setSaving(false);
    }
  };

  const submitReturn = async () => {
    if (!selected) return;
    const items = Object.entries(returnForm.lines)
      .map(([itemId, row]) => ({
        itemId,
        quantity: Number(row.quantity),
        restock: row.restock !== false,
      }))
      .filter((row) => row.quantity > 0);

    if (!items.length) {
      setActionError("Enter a return quantity for at least one item");
      return;
    }
    askReturnConfirm();
  };

  const copyPath = async (path, key) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setActionError("Could not copy link");
    }
  };

  const canEdit =
    selected &&
    selected.saleStatus === "Completed" &&
    !(selected.returns || []).length;
  const canPay =
    selected &&
    selected.saleStatus !== "Cancelled" &&
    Number(selected.balanceDue || 0) > 0;
  const canReturn =
    selected &&
    (selected.saleStatus === "Completed" ||
      selected.saleStatus === "Partially Returned") &&
    (selected.items || []).some((item) => remainingQty(item) > 0);
  const canCancel =
    selected &&
    (selected.saleStatus === "Completed" ||
      selected.saleStatus === "Partially Returned");

  const paymentHistory = useMemo(
    () => selected?.payments || [],
    [selected]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Retail · Transactions
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Sales history</h1>
          <p className="mt-1 text-sm text-muted">
            Three sales modes: garment POS only, stitching/booking only, or both
            (customers may use any combination).
          </p>
        </div>
        <Link
          to="/inventory/pos"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          New sale (POS)
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Receipt #, customer, phone…"
            className="w-full rounded-xl border border-slate-line bg-white py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={stream}
          onChange={(e) => {
            setStream(e.target.value);
            setPage(1);
            setSelected(null);
          }}
          className="rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">Both (garment POS + booking/stitching)</option>
          <option value="GARMENT">Garment / POS only</option>
          <option value="STITCHING">Booking / stitching only</option>
        </select>
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Payment status</option>
          <option value="Paid">Paid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Unpaid">Unpaid</option>
        </select>
        <select
          value={saleStatus}
          onChange={(e) => {
            setSaleStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Sale status</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Returned">Returned</option>
          <option value="Partially Returned">Partially Returned</option>
        </select>
        <select
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Payment channel</option>
          {TENDER_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={endDate || toInputDate()}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-line/80 bg-mist/50">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink text-white/90">
            <tr>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Receipt</th>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Customer</th>
              <th className="px-3 py-2.5">Total</th>
              <th className="px-3 py-2.5">Paid</th>
              <th className="px-3 py-2.5">Balance</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted">
                  No sales found.{" "}
                  <Link to="/inventory/pos" className="font-medium text-brass-deep underline">
                    Open POS
                  </Link>
                </td>
              </tr>
            ) : (
              items.map((sale) => {
                const isBooking =
                  sale.isBooking ||
                  sale.stream === "STITCHING" ||
                  sale.category === "STITCHING";
                return (
                <tr
                  key={`${sale.stream || "G"}-${sale._id}`}
                  className="border-t border-slate-line/70 bg-white/70 hover:bg-brass/5"
                >
                  <td className="px-3 py-2.5 text-xs font-medium uppercase text-muted">
                    {isBooking ? "Stitching" : "Garment"}
                  </td>
                  <td className="px-3 py-2.5 font-medium">
                    {isBooking ? (
                      <Link
                        to={sale.bookingPath || `/bookings/${sale._id}`}
                        className="hover:underline"
                      >
                        {sale.folio ? `${sale.folio} · ` : ""}
                        {sale.receiptNumber || sale.bookingNumber}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => openSale(sale._id)}
                      >
                        {sale.receiptNumber}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{formatDate(sale.saleDate)}</td>
                  <td className="px-3 py-2.5">
                    <p>{sale.customerName}</p>
                    <p className="text-xs text-muted">{sale.customerPhone || ""}</p>
                  </td>
                  <td className="px-3 py-2.5">{formatCurrency(sale.grandTotal)}</td>
                  <td className="px-3 py-2.5">{formatCurrency(sale.amountPaid)}</td>
                  <td className="px-3 py-2.5">{formatCurrency(sale.balanceDue)}</td>
                  <td className="px-3 py-2.5">
                    {sale.saleStatus}
                    <br />
                    <span className="text-xs text-muted">{sale.paymentStatus}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {isBooking ? (
                        <Link
                          to={sale.bookingPath || `/bookings/${sale._id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-line px-2 py-1 text-xs"
                        >
                          Open booking
                        </Link>
                      ) : null}
                      {!isBooking && sale.saleStatus === "Completed" ? (
                        <Link
                          to={sale.posPath || `/inventory/pos?saleId=${sale._id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-line px-2 py-1 text-xs"
                        >
                          <Pencil size={12} />
                          Edit
                        </Link>
                      ) : null}
                      {!isBooking && sale.receiptPath ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-line px-2 py-1 text-xs"
                          onClick={() => void copyPath(sale.receiptPath, sale._id)}
                        >
                          <Link2 size={12} />
                          {copied === sale._id ? "Copied" : "Link"}
                        </button>
                      ) : null}
                      {!isBooking && sale.saleStatus !== "Returned" ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-danger/40 px-2 py-1 text-xs text-danger"
                          onClick={() => askDeleteSale(sale)}
                          title="Delete sale and restore stock"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Page {pagination.page} of {pagination.totalPages || 1} · {pagination.total} total
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-line px-3 py-1.5 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= (pagination.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-line px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-mist p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xl">Sale {selected.receiptNumber}</h3>
              <div className="flex flex-wrap gap-2">
                {canEdit ? (
                  <Link
                    to={selected.posPath || `/inventory/pos?saleId=${selected._id}`}
                    className="rounded-xl border border-slate-line px-3 py-1.5 text-sm"
                  >
                    Edit in POS
                  </Link>
                ) : null}
                {canPay ? (
                  <button
                    type="button"
                    onClick={openPaymentPanel}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-line px-3 py-1.5 text-sm"
                  >
                    <Banknote size={14} />
                    Add payment
                  </button>
                ) : null}
                {canReturn ? (
                  <button
                    type="button"
                    onClick={openReturnPanel}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-line px-3 py-1.5 text-sm"
                  >
                    <RotateCcw size={14} />
                    Return items
                  </button>
                ) : null}
                {canCancel ? (
                  <button
                    type="button"
                    onClick={askCancelSale}
                    className="rounded-xl border border-slate-line px-3 py-1.5 text-sm"
                  >
                    Cancel sale
                  </button>
                ) : null}
                {selected.saleStatus !== "Returned" ? (
                  <button
                    type="button"
                    onClick={() => askDeleteSale(selected)}
                    className="rounded-xl border border-danger/40 px-3 py-1.5 text-sm text-danger"
                  >
                    Delete sale
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setPanel(null);
                  }}
                  className="rounded-xl border border-slate-line px-3 py-1.5 text-sm"
                >
                  Close
                </button>
              </div>
            </div>

            {actionError ? <p className="mb-2 text-sm text-danger">{actionError}</p> : null}

            <div className="mb-4 grid gap-2 rounded-xl border border-slate-line/80 bg-white p-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted">Gross total</p>
                <p className="font-semibold">{formatCurrency(selected.grandTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Returns</p>
                <p className="font-semibold">
                  {formatCurrency(selected.returnedTotal || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Paid</p>
                <p className="font-semibold">{formatCurrency(selected.amountPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Balance due</p>
                <p className="font-semibold">{formatCurrency(selected.balanceDue)}</p>
                <p className="text-xs text-muted">{selected.paymentStatus}</p>
              </div>
            </div>

            {panel === "payment" ? (
              <div className="mb-4 space-y-3 rounded-xl border border-brass/30 bg-brass/5 p-4">
                <h4 className="font-medium">Add payment</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-muted">
                    Amount
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={payForm.amount}
                      onChange={(e) =>
                        setPayForm((f) => ({ ...f, amount: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-muted">
                    Payment channel
                    <select
                      value={payForm.method}
                      onChange={(e) => {
                        const method = e.target.value;
                        setPayForm((f) => ({
                          ...f,
                          method,
                          reference:
                            method === "Cheque" || method === "Bank Transfer"
                              ? f.reference
                              : "",
                        }));
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                    >
                      {TENDER_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  {payForm.method === "Cheque" ||
                  payForm.method === "Bank Transfer" ? (
                    <label className="text-xs text-muted sm:col-span-2">
                      Reference (cheque / transfer #)
                      <input
                        value={payForm.reference}
                        onChange={(e) =>
                          setPayForm((f) => ({ ...f, reference: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                      />
                    </label>
                  ) : null}
                  <label className="text-xs text-muted sm:col-span-2">
                    Notes
                    <input
                      value={payForm.notes}
                      onChange={(e) =>
                        setPayForm((f) => ({ ...f, notes: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={submitPayment}
                    className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save payment"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel(null)}
                    className="rounded-xl border border-slate-line px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {panel === "return" ? (
              <div className="mb-4 space-y-3 rounded-xl border border-brass/30 bg-brass/5 p-4">
                <h4 className="font-medium">Return items</h4>
                <div className="space-y-2">
                  {(selected.items || [])
                    .filter((item) => remainingQty(item) > 0)
                    .map((item) => (
                      <div
                        key={item._id}
                        className="grid gap-2 rounded-lg border border-slate-line/70 bg-white p-3 sm:grid-cols-[1fr_100px_auto]"
                      >
                        <div>
                          <p className="text-sm font-medium">{item.productName}</p>
                          <p className="text-xs text-muted">
                            Remaining {remainingQty(item)} {item.unit || ""}
                          </p>
                        </div>
                        <label className="text-xs text-muted">
                          Qty
                          <input
                            type="number"
                            min="0"
                            step={item.unit === "PIECE" ? "1" : "0.1"}
                            max={remainingQty(item)}
                            value={returnForm.lines[item._id]?.quantity || ""}
                            onChange={(e) =>
                              setReturnForm((f) => ({
                                ...f,
                                lines: {
                                  ...f.lines,
                                  [item._id]: {
                                    ...f.lines[item._id],
                                    quantity: e.target.value,
                                    restock: f.lines[item._id]?.restock !== false,
                                  },
                                },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-line px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="flex items-end gap-2 pb-1 text-xs text-muted">
                          <input
                            type="checkbox"
                            checked={returnForm.lines[item._id]?.restock !== false}
                            onChange={(e) =>
                              setReturnForm((f) => ({
                                ...f,
                                lines: {
                                  ...f.lines,
                                  [item._id]: {
                                    ...f.lines[item._id],
                                    quantity: f.lines[item._id]?.quantity || "",
                                    restock: e.target.checked,
                                  },
                                },
                              }))
                            }
                          />
                          Restock
                        </label>
                      </div>
                    ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-muted">
                    Refund status
                    <select
                      value={returnForm.refundStatus}
                      onChange={(e) =>
                        setReturnForm((f) => ({
                          ...f,
                          refundStatus: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                    >
                      {REFUND_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-muted">
                    Reason
                    <input
                      value={returnForm.reason}
                      onChange={(e) =>
                        setReturnForm((f) => ({ ...f, reason: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={submitReturn}
                    className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Confirm return"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel(null)}
                    className="rounded-xl border border-slate-line px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {paymentHistory.length ? (
              <div className="mb-4 rounded-xl border border-slate-line/80 bg-white p-3">
                <h4 className="mb-2 text-sm font-semibold">Payment history</h4>
                <ul className="space-y-2 text-sm">
                  {paymentHistory.map((p) => (
                    <li
                      key={p._id || `${p.paidAt}-${p.amount}`}
                      className="flex flex-wrap justify-between gap-2 border-t border-slate-line/60 pt-2 first:border-0 first:pt-0"
                    >
                      <span>
                        {formatCurrency(p.amount)} · {p.method}
                        {p.reference ? (
                          <span className="text-muted"> · {p.reference}</span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted">
                        {formatDate(p.paidAt || p.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {(selected.returns || []).length ? (
              <div className="mb-4 rounded-xl border border-slate-line/80 bg-white p-3">
                <h4 className="mb-2 text-sm font-semibold">Returns</h4>
                <ul className="space-y-2 text-sm">
                  {selected.returns.map((ret) => (
                    <li key={ret._id || ret.returnNumber}>
                      <p className="font-medium">
                        {ret.returnNumber} · {formatCurrency(ret.refundAmount)} ·{" "}
                        {ret.refundStatus}
                      </p>
                      <p className="text-xs text-muted">
                        {ret.reason || "No reason"} · {formatDate(ret.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <ReceiptPreview sale={selected} />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.type === "delete"
            ? `Delete sale ${confirm.sale?.receiptNumber || ""}`
            : confirm?.type === "cancel"
              ? `Cancel sale ${confirm.sale?.receiptNumber || ""}`
              : "Confirm return"
        }
        message={
          confirm?.type === "delete"
            ? "Remaining stock will be restored and totals will update. This cannot be undone."
            : confirm?.type === "cancel"
              ? "Stock will be restored. The sale stays in history as Cancelled and is excluded from totals."
              : "Inventory will update for restocked items."
        }
        confirmLabel={
          confirm?.type === "delete"
            ? "Delete sale"
            : confirm?.type === "cancel"
              ? "Cancel sale"
              : "Confirm return"
        }
        cancelLabel="Keep"
        tone={confirm?.type === "return" ? "brass" : "danger"}
        reasonLabel={
          confirm?.type === "return" ? "" : "Reason (optional)"
        }
        reasonValue={confirmReason}
        onReasonChange={setConfirmReason}
        busy={confirmBusy}
        onCancel={closeConfirm}
        onConfirm={() => void runConfirm()}
      />
    </div>
  );
}
