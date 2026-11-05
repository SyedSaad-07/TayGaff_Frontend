import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Pencil, Ruler, Trash2 } from "lucide-react";
import { bookingApi } from "@/features/bookings/api";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { getErrorMessage } from "@/shared/api/client";
import { formatCurrency, formatDate, toInputDate } from "@/shared/lib/format";

function txTypeLabel(type) {
  switch (type) {
    case "OPENING_BALANCE":
      return "Opening";
    case "SALE":
      return "Sale";
    case "PAYMENT":
      return "Payment";
    case "ADJUSTMENT":
      return "Adjustment";
    case "RETURN":
      return "Return";
    default:
      return type || "—";
  }
}

function categoryLabel(cat) {
  switch (cat) {
    case "GARMENT":
      return "Garment";
    case "STITCHING":
      return "Stitching";
    case "GENERAL":
      return "General";
    default:
      return cat || "—";
  }
}

function safeDate(value) {
  if (!value) return "—";
  try {
    return formatDate(value);
  } catch {
    return "—";
  }
}

function profileFields(profile) {
  const fields =
    profile?.fields instanceof Map
      ? Object.fromEntries(profile.fields)
      : profile?.fields || {};
  return Object.fromEntries(
    Object.entries(fields).filter(([, v]) => String(v ?? "").trim() !== "")
  );
}

function MeasurementProfileCard({ profile, fieldDefs, archived, onUse }) {
  const [open, setOpen] = useState(false);
  const fields = useMemo(() => profileFields(profile), [profile]);
  const labelByKey = useMemo(() => {
    const map = {};
    for (const f of fieldDefs || []) map[f.key] = f.label;
    return map;
  }, [fieldDefs]);

  const groups = useMemo(() => {
    const byGroup = {};
    const known = new Set((fieldDefs || []).map((f) => f.key));
    for (const f of fieldDefs || []) {
      const val = fields[f.key];
      if (val == null || String(val).trim() === "") continue;
      if (!byGroup[f.group]) byGroup[f.group] = [];
      byGroup[f.group].push({ key: f.key, label: f.label, value: val });
    }
    const extras = Object.entries(fields).filter(([k]) => !known.has(k));
    if (extras.length) {
      byGroup.other = extras.map(([key, value]) => ({
        key,
        label: key,
        value,
      }));
    }
    return byGroup;
  }, [fieldDefs, fields]);

  const preview = Object.entries(fields)
    .slice(0, 8)
    .map(([k, v]) => `${labelByKey[k] || k}: ${v}`)
    .join(" · ");

  const title =
    [profile.itemCode, profile.itemName || profile.garmentItem?.name || "Garment"]
      .filter(Boolean)
      .join(" · ") || "Measurement profile";

  return (
    <li className="rounded-xl border border-slate-line/60 bg-white/80">
      <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="font-medium text-ink">
            {title}
            {profile.folio ? (
              <span className="ml-2 text-xs font-normal text-muted">
                Folio {profile.folio}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Updated {safeDate(profile.updatedAt)} · {Object.keys(fields).length}{" "}
            measures
            {!open && preview ? ` · ${preview}${Object.keys(fields).length > 8 ? "…" : ""}` : ""}
          </p>
        </button>
        <div className="flex items-center gap-1.5">
          {!archived ? (
            <button
              type="button"
              onClick={onUse}
              className="inline-flex items-center gap-1 rounded-lg bg-brass px-2.5 py-1.5 text-xs font-semibold text-white"
            >
              <Ruler size={12} />
              Use for booking
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-slate-line p-1.5 text-muted"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-slate-line/60 px-3 py-3">
          {Object.keys(groups).length === 0 ? (
            <p className="text-sm text-muted">No measurement values on this profile.</p>
          ) : (
            Object.entries(groups).map(([group, rows]) => (
              <div key={group}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {group.replace(/_/g, " ")}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {rows.map((row) => (
                    <div
                      key={row.key}
                      className="rounded-lg border border-slate-line/70 bg-mist/50 px-2.5 py-1.5"
                    >
                      <p className="text-[11px] text-muted">{row.label}</p>
                      <p className="text-sm font-medium text-ink">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          {profile.remarks ? (
            <p className="text-sm text-ink/80">
              <span className="text-muted">Remarks: </span>
              {profile.remarks}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [measureFields, setMeasureFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState("ALL");
  const [payForm, setPayForm] = useState({
    amount: "",
    paymentDate: toInputDate(new Date()),
    category: "GENERAL",
    note: "",
  });
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);
  const [ledgerForm, setLedgerForm] = useState({
    totalAmount: "",
    paidAmount: "",
    date: toInputDate(new Date()),
    category: "GENERAL",
    note: "",
  });
  const [ledgerError, setLedgerError] = useState("");
  const [ledgerSaving, setLedgerSaving] = useState(false);
  const [showLedgerForm, setShowLedgerForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [customerData, fields] = await Promise.all([
        bookingApi.getCustomer(id),
        bookingApi.measureFields().catch(() => []),
      ]);
      setData(customerData);
      setMeasureFields(Array.isArray(fields) ? fields : []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load customer"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.customer || !editing) return;
    const c = data.customer;
    setForm({
      name: c.name || "",
      phone1: c.phone1 || "",
      phone2: c.phone2 || "",
      phone3: c.phone3 || "",
      address: c.address || "",
      address2: c.address2 || "",
      notes: c.notes || "",
    });
    setFormError("");
  }, [data?.customer, editing]);

  const saveEdit = async () => {
    if (!form?.name?.trim()) {
      setFormError("Customer name is required");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await bookingApi.updateCustomer(id, {
        name: form.name.trim(),
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim(),
        phone3: form.phone3.trim(),
        address: form.address.trim(),
        address2: form.address2.trim(),
        notes: form.notes.trim(),
      });
      setEditing(false);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async () => {
    setSaving(true);
    setError("");
    try {
      await bookingApi.archiveCustomer(id);
      setConfirmDelete(false);
      navigate("/customers");
    } catch (err) {
      setError(getErrorMessage(err, "Delete failed"));
      setSaving(false);
    }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setPaying(true);
    setPayError("");
    try {
      await bookingApi.recordCustomerPayment(id, {
        amount: Number(payForm.amount),
        paymentDate: payForm.paymentDate,
        category: payForm.category,
        note: payForm.note || undefined,
      });
      setPayForm({
        amount: "",
        paymentDate: toInputDate(new Date()),
        category: "GENERAL",
        note: "",
      });
      await load();
    } catch (err) {
      setPayError(getErrorMessage(err, "Payment failed"));
    } finally {
      setPaying(false);
    }
  };

  const submitLedgerEntry = async (e) => {
    e.preventDefault();
    setLedgerSaving(true);
    setLedgerError("");
    try {
      const kul = Number(ledgerForm.totalAmount || 0);
      const paid = Number(ledgerForm.paidAmount || 0);
      if (paid > kul && kul > 0) {
        setLedgerError("Pehle se ada cannot exceed kul amount");
        setLedgerSaving(false);
        return;
      }
      await bookingApi.createCustomerTransaction(id, {
        type: "OPENING_BALANCE",
        totalAmount: kul > 0 ? kul : paid,
        paidAmount: paid,
        date: ledgerForm.date,
        category: ledgerForm.category,
        note: ledgerForm.note || undefined,
      });
      setLedgerForm({
        totalAmount: "",
        paidAmount: "",
        date: toInputDate(new Date()),
        category: "GENERAL",
        note: "",
      });
      setShowLedgerForm(false);
      await load();
    } catch (err) {
      setLedgerError(getErrorMessage(err, "Ledger entry failed"));
    } finally {
      setLedgerSaving(false);
    }
  };

  const useProfileForBooking = (profile) => {
    const params = new URLSearchParams({
      customerId: customer?._id || id,
      profileId: profile._id,
    });
    navigate(`/bookings?${params.toString()}`);
  };

  if (loading) {
    return <p className="text-sm text-muted">Loading customer…</p>;
  }
  if (error && !data) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        {error}
      </div>
    );
  }

  const {
    customer,
    bookings = [],
    measurementProfiles = [],
    transactions: rawTx = [],
    ledgerSummary,
    balance: pageBalance,
  } = data || {};
  const archived = Boolean(customer?.isArchived);
  const balance = pageBalance ?? customer?.balance ?? 0;
  const summary = ledgerSummary || customer?.ledgerSummary || null;
  const transactions =
    ledgerFilter === "ALL"
      ? rawTx
      : rawTx.filter((tx) => tx.category === ledgerFilter);

  return (
    <div className="space-y-6">
      <Link
        to="/customers"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={14} />
        Customers
      </Link>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Customer · {customer?.code}
            {archived ? " · Archived" : ""}
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">{customer?.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {[customer?.phone1, customer?.phone2, customer?.phone3]
              .filter(Boolean)
              .join(" · ") || "No phone"}
            {customer?.address ? ` · ${customer.address}` : ""}
          </p>
          <p className="mt-2 text-sm font-medium text-ink">
            Outstanding: {formatCurrency(balance)}
          </p>
          {customer?.notes ? (
            <p className="mt-2 text-sm text-ink/70">{customer.notes}</p>
          ) : null}
        </div>
        {!archived ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-line px-3 py-1.5 text-sm"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1 rounded-xl border border-danger/40 px-3 py-1.5 text-sm text-danger"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await bookingApi.restoreCustomer(id);
                await load();
              } catch (err) {
                setError(getErrorMessage(err, "Restore failed"));
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-xl bg-brass px-3 py-1.5 text-sm font-semibold text-white"
          >
            Restore customer
          </button>
        )}
      </div>

      {editing && form ? (
        <section className="space-y-3 rounded-2xl border border-brass/40 bg-white p-4">
          <h2 className="font-display text-2xl">Edit details</h2>
          {formError ? (
            <p className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}
          <label className="block text-sm">
            <span className="text-muted">Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            {["phone1", "phone2", "phone3"].map((key, i) => (
              <label key={key} className="block text-sm">
                <span className="text-muted">Phone {i + 1}</span>
                <input
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                />
              </label>
            ))}
          </div>
          <label className="block text-sm">
            <span className="text-muted">Address</span>
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Address 2</span>
            <input
              value={form.address2}
              onChange={(e) =>
                setForm((f) => ({ ...f, address2: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
            />
          </label>
          <div className="flex gap-2">
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
              onClick={() => setEditing(false)}
              className="rounded-xl border border-slate-line px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-slate-line/80 bg-mist/40 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Customer ledger</h2>
            <p className="text-xs text-muted">
              Single ledger for garment + stitching. Legacy customers have no
              sales money imported — add opening balance manually for purana baqi.
            </p>
          </div>
          <select
            value={ledgerFilter}
            onChange={(e) => setLedgerFilter(e.target.value)}
            className="rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">All categories</option>
            <option value="GARMENT">Garment</option>
            <option value="STITCHING">Stitching</option>
            <option value="GENERAL">General</option>
          </select>
        </div>

        {summary ? (
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-line/60 bg-white/80 px-3 py-2">
              <p className="text-[11px] uppercase text-muted">Remaining</p>
              <p className="font-medium">{formatCurrency(summary.remaining)}</p>
            </div>
            <div className="rounded-xl border border-slate-line/60 bg-white/80 px-3 py-2">
              <p className="text-[11px] uppercase text-muted">Garment</p>
              <p className="font-medium">
                {formatCurrency(summary.byCategory?.GARMENT?.remaining || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-line/60 bg-white/80 px-3 py-2">
              <p className="text-[11px] uppercase text-muted">Stitching</p>
              <p className="font-medium">
                {formatCurrency(summary.byCategory?.STITCHING?.remaining || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-line/60 bg-white/80 px-3 py-2">
              <p className="text-[11px] uppercase text-muted">General</p>
              <p className="font-medium">
                {formatCurrency(summary.byCategory?.GENERAL?.remaining || 0)}
              </p>
            </div>
          </div>
        ) : null}

        {!archived ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <form
              onSubmit={submitPayment}
              className="space-y-2 rounded-xl border border-slate-line/70 bg-white/80 p-3"
            >
              <p className="text-sm font-semibold">Add payment</p>
              {payError ? (
                <p className="text-sm text-danger">{payError}</p>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-muted">Amount</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={payForm.amount}
                    onChange={(e) =>
                      setPayForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-line px-2 py-1.5"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted">Date</span>
                  <input
                    type="date"
                    required
                    value={payForm.paymentDate}
                    onChange={(e) =>
                      setPayForm((f) => ({ ...f, paymentDate: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-line px-2 py-1.5"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-muted">Category</span>
                <select
                  value={payForm.category}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-line px-2 py-1.5"
                >
                  <option value="GENERAL">General</option>
                  <option value="GARMENT">Garment</option>
                  <option value="STITCHING">Stitching</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={paying}
                className="rounded-lg bg-brass px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {paying ? "Recording…" : "Record payment"}
              </button>
            </form>

            <div className="space-y-2 rounded-xl border border-slate-line/70 bg-white/80 p-3">
              <button
                type="button"
                onClick={() => setShowLedgerForm((v) => !v)}
                className="text-sm font-semibold text-brass-deep hover:underline"
              >
                {showLedgerForm ? "Hide opening entry" : "Add opening balance"}
              </button>
              {showLedgerForm ? (
                <form onSubmit={submitLedgerEntry} className="space-y-2">
                  {ledgerError ? (
                    <p className="text-sm text-danger">{ledgerError}</p>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="text-muted">Kul hisab</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={ledgerForm.totalAmount}
                        onChange={(e) =>
                          setLedgerForm((f) => ({
                            ...f,
                            totalAmount: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-line px-2 py-1.5"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-muted">Pehle se ada</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={ledgerForm.paidAmount}
                        onChange={(e) =>
                          setLedgerForm((f) => ({
                            ...f,
                            paidAmount: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-line px-2 py-1.5"
                      />
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="text-muted">Date</span>
                      <input
                        type="date"
                        required
                        value={ledgerForm.date}
                        onChange={(e) =>
                          setLedgerForm((f) => ({ ...f, date: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-line px-2 py-1.5"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-muted">Category</span>
                      <select
                        value={ledgerForm.category}
                        onChange={(e) =>
                          setLedgerForm((f) => ({
                            ...f,
                            category: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-line px-2 py-1.5"
                      >
                        <option value="GENERAL">General</option>
                        <option value="GARMENT">Garment</option>
                        <option value="STITCHING">Stitching</option>
                      </select>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={ledgerSaving}
                    className="rounded-lg border border-slate-line px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                  >
                    {ledgerSaving ? "Saving…" : "Save opening"}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-slate-line/60 bg-white/80">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ink text-white/90">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2 text-right">Billed</th>
                <th className="px-3 py-2 text-right">Paid</th>
                <th className="px-3 py-2 text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted">
                    No ledger rows yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id || tx._id} className="border-t border-slate-line/60">
                    <td className="px-3 py-2">{safeDate(tx.date)}</td>
                    <td className="px-3 py-2">{txTypeLabel(tx.type)}</td>
                    <td className="px-3 py-2">{categoryLabel(tx.category)}</td>
                    <td className="px-3 py-2">
                      {tx.note ||
                        tx.booking?.bookingNumber ||
                        tx.sale?.receiptNumber ||
                        "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(tx.totalAmount || 0)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(tx.paidAmount || 0)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(tx.remainingAmount || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-line/80 bg-mist/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl">
              Bookings
              <span className="ml-2 text-sm font-sans font-normal text-muted">
                ({bookings.length})
              </span>
            </h2>
            {!archived ? (
              <Link
                to={`/bookings?customerId=${customer?._id}`}
                className="text-sm font-medium text-brass-deep hover:underline"
              >
                New booking
              </Link>
            ) : null}
          </div>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted">
              No bookings linked to this customer yet. Use a measurement profile
              on the right to start a booking with those sizes filled in.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {bookings.map((b) => (
                <li
                  key={b._id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-line/60 bg-white/70 px-3 py-2"
                >
                  <div>
                    <Link
                      to={`/bookings/${b._id}`}
                      className="font-medium hover:underline"
                    >
                      {b.folio} · {b.bookingNumber}
                    </Link>
                    <p className="text-xs text-muted">
                      {safeDate(b.bookingDate)} → {safeDate(b.deliveryDate)} ·{" "}
                      {b.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(b.grandTotal)}</p>
                    <p className="text-xs text-muted">{b.paymentStatus}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-line/80 bg-mist/40 p-4">
          <h2 className="mb-1 font-display text-xl">
            Measurement profiles
            <span className="ml-2 text-sm font-sans font-normal text-muted">
              ({measurementProfiles.length})
            </span>
          </h2>
          <p className="mb-3 text-xs text-muted">
            Saved size cards. Expand to view all measures, or use one to open a
            new booking with those values prefilled.
          </p>
          {measurementProfiles.length === 0 ? (
            <p className="text-sm text-muted">
              No saved profiles. Profiles come from migrated MEASURE data or when
              you save measurements on a booking.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {measurementProfiles.map((p) => (
                <MeasurementProfileCard
                  key={p._id}
                  profile={p}
                  fieldDefs={measureFields}
                  archived={archived}
                  onUse={() => useProfileForBooking(p)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete customer ${customer?.name || ""}`}
        message={`Code ${customer?.code || ""}. The customer will be archived. Booking history is kept.`}
        confirmLabel="Delete customer"
        cancelLabel="Keep"
        tone="danger"
        busy={saving}
        onCancel={() => {
          if (!saving) setConfirmDelete(false);
        }}
        onConfirm={() => void deleteCustomer()}
      />
    </div>
  );
}
