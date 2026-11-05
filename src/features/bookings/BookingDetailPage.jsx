import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { bookingApi } from "@/features/bookings/api";
import { TailoringSlip } from "@/features/bookings/TailoringSlip";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { TENDER_METHODS } from "@/shared/constants";
import { useBookingStatusCatalog } from "@/features/bookings/useBookingStatuses";
import { getErrorMessage } from "@/shared/api/client";
import { formatCurrency, formatDate, toInputDate } from "@/shared/lib/format";

function safeDate(value) {
  if (!value) return "—";
  try {
    return formatDate(value);
  } catch {
    return "—";
  }
}

function formatKarigarLabel(name, code) {
  const n = String(name || "").trim();
  const c = String(code || "").trim();
  if (n && c) return `${n} (${c})`;
  return n || c || "";
}

export function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { optionsFor } = useBookingStatusCatalog();
  const [booking, setBooking] = useState(null);
  const [karigars, setKarigars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slipLineId, setSlipLineId] = useState(null);
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [editForm, setEditForm] = useState(null);
  const [payForm, setPayForm] = useState({
    amount: "",
    method: "Cash",
    reference: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [bookingData, karigarList] = await Promise.all([
        bookingApi.getById(id),
        bookingApi.karigars().catch(() => []),
      ]);
      setBooking(bookingData);
      setKarigars(Array.isArray(karigarList) ? karigarList : []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load booking"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (booking?.balanceDue != null) {
      setPayForm((f) => ({ ...f, amount: String(booking.balanceDue || "") }));
    }
  }, [booking?.balanceDue, booking?._id]);

  useEffect(() => {
    if (!booking || !editing) return;
    setEditForm({
      bookingDate: toInputDate(booking.bookingDate),
      deliveryDate: booking.deliveryDate ? toInputDate(booking.deliveryDate) : "",
      discountTotal: String(booking.discountTotal ?? 0),
      notes: booking.notes || "",
      lines: (booking.lines || []).map((l) => ({
        lineId: l._id,
        amount: String(l.amount ?? 0),
        quantity: String(l.quantity ?? 1),
        karigarCode: l.karigarCode || "",
        stitchingInstructions: l.stitchingInstructions || "",
        remarks: l.remarks || "",
      })),
    });
  }, [booking, editing]);

  const updateStatus = async (lineId, status) => {
    setSaving(true);
    setError("");
    try {
      setBooking(await bookingApi.updateLineStatus(id, lineId, { status }));
    } catch (err) {
      setError(getErrorMessage(err, "Status update failed"));
    } finally {
      setSaving(false);
    }
  };

  const assignKarigar = async (lineId, karigarCode) => {
    if (!booking) return;
    setSaving(true);
    setError("");
    try {
      const updated = await bookingApi.update(id, {
        lines: (booking.lines || []).map((l) => ({
          lineId: l._id || l.id,
          amount: Number(l.amount) || 0,
          quantity: Number(l.quantity) || 1,
          karigarCode:
            String(l._id || l.id) === String(lineId)
              ? karigarCode
              : l.karigarCode || "",
          stitchingInstructions: l.stitchingInstructions || "",
          remarks: l.remarks || "",
        })),
      });
      setBooking(updated);
    } catch (err) {
      setError(getErrorMessage(err, "Could not assign karigar"));
    } finally {
      setSaving(false);
    }
  };

  const addPayment = async () => {
    const amount = Number(payForm.amount);
    if (!(amount > 0)) {
      setError("Enter a payment amount");
      return;
    }
    setSaving(true);
    setError("");
    try {
      setBooking(
        await bookingApi.addPayment(id, {
          amount,
          method: payForm.method,
          reference: payForm.reference,
          notes: payForm.notes,
        })
      );
      setPayForm({ amount: "", method: "Cash", reference: "", notes: "" });
    } catch (err) {
      setError(getErrorMessage(err, "Payment failed"));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editForm) return;
    setSaving(true);
    setError("");
    try {
      const updated = await bookingApi.update(id, {
        bookingDate: editForm.bookingDate || undefined,
        deliveryDate: editForm.deliveryDate || null,
        discountTotal: Number(editForm.discountTotal) || 0,
        notes: editForm.notes,
        lines: editForm.lines.map((l) => ({
          lineId: l.lineId,
          amount: Number(l.amount) || 0,
          quantity: Number(l.quantity) || 1,
          karigarCode: l.karigarCode,
          stitchingInstructions: l.stitchingInstructions,
          remarks: l.remarks,
        })),
      });
      setBooking(updated);
      setEditing(false);
      navigate(`/bookings/${id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  const deleteBooking = async () => {
    setSaving(true);
    setError("");
    try {
      await bookingApi.remove(id);
      setConfirmDelete(false);
      navigate("/bookings");
    } catch (err) {
      setError(getErrorMessage(err, "Delete failed"));
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted">Loading booking…</p>;
  if (!booking) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        {error || "Booking not found"}
      </div>
    );
  }

  const slipLine = (booking.lines || []).find((l) => l._id === slipLineId);
  const canEdit = booking.status !== "Cancelled";

  return (
    <div className="space-y-6">
      <Link
        to="/bookings"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={14} />
        Bookings
      </Link>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {Number(booking.grandTotal) === 0 ? (
        <div className="rounded-xl border border-brass/40 bg-brass/5 px-4 py-3 text-sm text-ink/80">
          Total is 0 because the legacy booking file mostly had empty AMOUNT values.
          Use <strong>Edit</strong> to enter line prices.
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Folio {booking.folio} · {booking.bookingNumber}
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            {booking.customerName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Code {booking.customerCode} · Booked {safeDate(booking.bookingDate)} ·
            Due {safeDate(booking.deliveryDate)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-2xl border border-slate-line bg-mist/50 px-4 py-3 text-right text-sm">
            <p>
              Total {formatCurrency(booking.grandTotal)} · Paid{" "}
              {formatCurrency(booking.amountPaid)}
            </p>
            <p className="font-semibold">
              Balance {formatCurrency(booking.balanceDue)} · {booking.paymentStatus}
            </p>
            <p className="text-muted">{booking.status}</p>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-line px-3 py-1.5 text-sm"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              ) : null}
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-danger/40 px-3 py-1.5 text-sm text-danger"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {editing && editForm ? (
        <section className="space-y-4 rounded-2xl border border-brass/40 bg-white p-4">
          <h2 className="font-display text-2xl">Edit booking</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted">Booking date</span>
              <input
                type="date"
                value={editForm.bookingDate}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, bookingDate: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Delivery date</span>
              <input
                type="date"
                value={editForm.deliveryDate}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, deliveryDate: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Discount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editForm.discountTotal}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, discountTotal: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-muted">Notes</span>
              <textarea
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
              />
            </label>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Line amounts</p>
            {editForm.lines.map((line, idx) => {
              const original = booking.lines[idx];
              return (
                <div
                  key={line.lineId}
                  className="grid gap-2 rounded-xl border border-slate-line/70 bg-mist/40 p-3 sm:grid-cols-4"
                >
                  <p className="text-sm sm:col-span-4">
                    Slip {original?.slipNumber} · {original?.itemCode}{" "}
                    {original?.itemName}
                  </p>
                  <label className="block text-sm">
                    <span className="text-muted">Amount</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.amount}
                      onChange={(e) =>
                        setEditForm((f) => {
                          const lines = [...f.lines];
                          lines[idx] = { ...lines[idx], amount: e.target.value };
                          return { ...f, lines };
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-line px-2 py-1.5"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-muted">Qty</span>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) =>
                        setEditForm((f) => {
                          const lines = [...f.lines];
                          lines[idx] = { ...lines[idx], quantity: e.target.value };
                          return { ...f, lines };
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-line px-2 py-1.5"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-muted">Karigar</span>
                    <select
                      value={line.karigarCode}
                      onChange={(e) =>
                        setEditForm((f) => {
                          const lines = [...f.lines];
                          lines[idx] = {
                            ...lines[idx],
                            karigarCode: e.target.value,
                          };
                          return { ...f, lines };
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-line px-2 py-1.5"
                    >
                      <option value="">Optional</option>
                      {karigars.map((k) => (
                        <option key={k._id || k.code} value={k.code}>
                          {formatKarigarLabel(k.name, k.code)}
                        </option>
                      ))}
                      {line.karigarCode &&
                      !karigars.some((k) => k.code === line.karigarCode) ? (
                        <option value={line.karigarCode}>
                          {formatKarigarLabel("", line.karigarCode)}
                        </option>
                      ) : null}
                    </select>
                  </label>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={saveEdit}
              className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                navigate(`/bookings/${id}`, { replace: true });
              }}
              className="rounded-xl border border-slate-line px-4 py-2 text-sm"
            >
              Cancel edit
            </button>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Garment lines</h2>
        {(booking.lines || []).map((line) => {
          const measures =
            line.measurementSnapshot instanceof Map
              ? Object.fromEntries(line.measurementSnapshot)
              : line.measurementSnapshot || {};
          const measureKeys = Object.keys(measures).filter((k) => measures[k]);
          return (
            <div
              key={line._id}
              className="rounded-2xl border border-slate-line/80 bg-white/80 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    Slip {line.slipNumber} · {line.itemCode} {line.itemName}
                  </p>
                  <p className="text-xs text-muted">
                    Qty {line.quantity} · {formatCurrency(line.amount)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="whitespace-nowrap">Karigar</span>
                    <select
                      value={line.karigarCode || line.karigar?.code || ""}
                      disabled={saving || !canEdit}
                      onChange={(e) =>
                        void assignKarigar(line._id, e.target.value)
                      }
                      className="rounded-lg border border-slate-line bg-white px-2 py-1.5 text-sm text-ink"
                    >
                      <option value="">Unassigned</option>
                      {karigars.map((k) => (
                        <option key={k._id || k.code} value={k.code}>
                          {formatKarigarLabel(k.name, k.code)}
                        </option>
                      ))}
                      {(line.karigarCode || line.karigar?.code) &&
                      !karigars.some(
                        (k) =>
                          k.code === (line.karigarCode || line.karigar?.code)
                      ) ? (
                        <option
                          value={line.karigarCode || line.karigar?.code}
                        >
                          {formatKarigarLabel(
                            line.karigar?.name,
                            line.karigarCode || line.karigar?.code
                          )}
                        </option>
                      ) : null}
                    </select>
                  </label>
                  <select
                    value={line.status}
                    disabled={saving || booking.status === "Cancelled"}
                    onChange={(e) => updateStatus(line._id, e.target.value)}
                    className="rounded-lg border border-slate-line px-2 py-1.5 text-sm"
                  >
                    {optionsFor(line.status).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setSlipLineId(line._id)}
                    className="rounded-lg bg-brass px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    Tailoring slip
                  </button>
                </div>
              </div>
              {measureKeys.length ? (
                <div className="mt-3 grid grid-cols-2 gap-1 text-xs sm:grid-cols-4">
                  {measureKeys.map((k) => (
                    <div
                      key={k}
                      className="flex justify-between gap-1 border-b border-slate-line/40 py-0.5"
                    >
                      <span className="text-muted">{k}</span>
                      <span>{measures[k]}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {line.stitchingInstructions ? (
                <p className="mt-2 text-sm">
                  <span className="text-muted">Stitches: </span>
                  {line.stitchingInstructions}
                </p>
              ) : null}
              {line.remarks ? (
                <p className="mt-1 text-sm">
                  <span className="text-muted">Remarks: </span>
                  {line.remarks}
                </p>
              ) : null}
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-line/80 bg-mist/40 p-4">
          <h2 className="font-display text-xl">Payments</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(booking.payments || []).length === 0 ? (
              <li className="text-muted">No payments yet.</li>
            ) : (
              booking.payments.map((p) => (
                <li
                  key={p._id}
                  className="flex justify-between rounded-xl border border-slate-line/50 bg-white/70 px-3 py-2"
                >
                  <span>
                    {formatCurrency(p.amount)} · {p.method}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </span>
                  <span className="text-muted">{safeDate(p.paidAt)}</span>
                </li>
              ))
            )}
          </ul>

          {booking.balanceDue > 0 && booking.status !== "Cancelled" ? (
            <div className="mt-4 space-y-2 border-t border-slate-line pt-4">
              <p className="text-sm font-medium">Record payment</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payForm.amount}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  placeholder="Amount"
                  className="rounded-xl border border-slate-line px-3 py-2 text-sm"
                />
                <select
                  value={payForm.method}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, method: e.target.value }))
                  }
                  className="rounded-xl border border-slate-line px-3 py-2 text-sm"
                >
                  {TENDER_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  value={payForm.reference}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, reference: e.target.value }))
                  }
                  placeholder="Reference / cheque #"
                  className="rounded-xl border border-slate-line px-3 py-2 text-sm sm:col-span-2"
                />
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={addPayment}
                className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white"
              >
                {saving ? "Saving…" : "Add payment"}
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-line/80 bg-mist/40 p-4">
          <h2 className="font-display text-xl">Status history</h2>
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-xs text-muted">
            {(booking.statusHistory || [])
              .slice()
              .reverse()
              .map((h) => (
                <li key={h._id || `${h.at}-${h.status}`}>
                  {safeDate(h.at)} · {h.status}
                  {h.note ? ` — ${h.note}` : ""}
                </li>
              ))}
          </ul>
        </section>
      </div>

      {slipLine ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 p-4">
          <div className="mx-auto max-w-3xl rounded-2xl bg-mist p-4">
            <div className="mb-3 flex justify-end print:hidden">
              <button
                type="button"
                onClick={() => setSlipLineId(null)}
                className="rounded-xl border border-slate-line px-3 py-1.5 text-sm"
              >
                Close
              </button>
            </div>
            <TailoringSlip booking={booking} line={slipLine} />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete booking ${booking.folio}`}
        message="It will be cancelled and removed from the active list."
        confirmLabel="Delete booking"
        cancelLabel="Keep"
        tone="danger"
        busy={saving}
        onCancel={() => {
          if (!saving) setConfirmDelete(false);
        }}
        onConfirm={() => void deleteBooking()}
      />
    </div>
  );
}
