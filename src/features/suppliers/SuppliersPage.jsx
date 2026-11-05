import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Archive, Pencil } from "lucide-react";
import { supplierApi } from "@/features/suppliers/api";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { getErrorMessage } from "@/shared/api/client";
import { formatCurrency, formatDate, toInputDate } from "@/shared/lib/format";

const emptyForm = () => ({
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  openingRemaining: "",
  openingPaid: "",
  openingDate: toInputDate(new Date()),
  openingNote: "",
});

const emptyPay = () => ({
  amount: "",
  paymentDate: toInputDate(new Date()),
  note: "",
});

const emptyLedgerForm = () => ({
  totalAmount: "",
  paidAmount: "",
  date: toInputDate(new Date()),
  note: "",
});

function txTypeLabel(type) {
  switch (type) {
    case "OPENING_BALANCE":
      return "Opening";
    case "PURCHASE":
      return "Purchase";
    case "PAYMENT":
      return "Payment";
    case "ADJUSTMENT":
      return "Adjustment";
    default:
      return type || "—";
  }
}

export function SuppliersPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [payForm, setPayForm] = useState(emptyPay);
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);
  const [ledgerForm, setLedgerForm] = useState(emptyLedgerForm);
  const [ledgerError, setLedgerError] = useState("");
  const [ledgerSaving, setLedgerSaving] = useState(false);
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await supplierApi.list({ page, limit: 15, search });
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load suppliers"));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormError("");
    setPanel("form");
  };

  const openEdit = (item) => {
    setEditId(item._id);
    setForm({
      ...emptyForm(),
      name: item.name || "",
      contactPerson: item.contactPerson || "",
      phone: item.phone || "",
      email: item.email || "",
      address: item.address || "",
    });
    setFormError("");
    setPanel("form");
  };

  const openDetail = async (id) => {
    setError("");
    setPayError("");
    setPayForm(emptyPay());
    setLedgerForm(emptyLedgerForm());
    setLedgerError("");
    setShowLedgerForm(false);
    try {
      const data = await supplierApi.getById(id);
      setDetail(data);
      setPanel("detail");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load supplier"));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name,
        contactPerson: form.contactPerson,
        phone: form.phone,
        email: form.email,
        address: form.address,
      };

      if (!editId) {
        const kul = Number(form.openingRemaining || 0);
        const paid = Number(form.openingPaid || 0);
        if (kul > 0 || paid > 0) {
          if (!form.openingDate) {
            setFormError("Opening balance date is required when an amount is given");
            setSaving(false);
            return;
          }
          if (kul < 0 || paid < 0) {
            setFormError("Opening balance amounts cannot be negative");
            setSaving(false);
            return;
          }
          if (paid > kul && kul > 0) {
            setFormError("Pehle se ada cannot exceed kul amount");
            setSaving(false);
            return;
          }
          payload.openingBalance = {
            totalAmount: kul > 0 ? kul : paid,
            paidAmount: paid,
            date: form.openingDate,
            note: form.openingNote || undefined,
          };
        }
      }

      if (editId) await supplierApi.update(editId, payload);
      else await supplierApi.create(payload);
      setPanel(null);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget?._id) return;
    const id = archiveTarget._id;
    setArchiveBusy(true);
    setError("");
    try {
      await supplierApi.archive(id);
      setArchiveTarget(null);
      await load();
      if (detail?.supplier?._id === id) setPanel(null);
    } catch (err) {
      setError(getErrorMessage(err, "Archive failed"));
    } finally {
      setArchiveBusy(false);
    }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!detail?.supplier?._id) return;
    setPaying(true);
    setPayError("");
    try {
      await supplierApi.recordPayment(detail.supplier._id, {
        amount: Number(payForm.amount),
        paymentDate: payForm.paymentDate,
        note: payForm.note || undefined,
      });
      const data = await supplierApi.getById(detail.supplier._id);
      setDetail(data);
      setPayForm(emptyPay());
      await load();
    } catch (err) {
      setPayError(getErrorMessage(err, "Payment failed"));
    } finally {
      setPaying(false);
    }
  };

  const submitLedgerEntry = async (e) => {
    e.preventDefault();
    if (!detail?.supplier?._id) return;
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
      await supplierApi.createTransaction(detail.supplier._id, {
        type: "OPENING_BALANCE",
        totalAmount: kul > 0 ? kul : paid,
        paidAmount: paid,
        date: ledgerForm.date,
        note: ledgerForm.note || undefined,
      });
      const data = await supplierApi.getById(detail.supplier._id);
      setDetail(data);
      setLedgerForm(emptyLedgerForm());
      setShowLedgerForm(false);
      await load();
    } catch (err) {
      setLedgerError(getErrorMessage(err, "Could not save ledger entry"));
    } finally {
      setLedgerSaving(false);
    }
  };

  const outstanding = Number(
    detail?.stats?.balance ?? detail?.stats?.outstandingCredit ?? 0
  );
  const ledgerRows = detail?.transactions || detail?.ledger || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Purchasing · Creditors
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Suppliers</h1>
          <p className="mt-1 text-sm text-muted">
            Contact details plus a derived payable ledger (opening, purchases, payments).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add supplier
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, phone, email…"
            className="w-full rounded-xl border border-slate-line bg-white py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
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
              <th className="px-3 py-2.5">Supplier</th>
              <th className="px-3 py-2.5">Contact</th>
              <th className="px-3 py-2.5 text-right">Balance owed</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted">
                  No suppliers yet. Add your first vendor.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item._id} className="border-t border-slate-line/70 bg-white/70">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-ink">{item.name}</p>
                    <p className="text-xs text-muted">{item.address || "—"}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted">
                    {item.phone || item.contactPerson || item.email || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                    {formatCurrency(item.balance ?? item.outstandingCredit ?? 0)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openDetail(item._id)}
                        className="rounded-lg border border-slate-line px-2 py-1 text-xs"
                      >
                        Ledger
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="rounded-lg border border-slate-line px-2 py-1 text-xs"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchiveTarget(item)}
                        className="rounded-lg border border-danger/30 px-2 py-1 text-xs text-danger"
                      >
                        <Archive size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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

      {panel === "form" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <form
            onSubmit={submit}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-mist p-5 shadow-xl"
          >
            <h2 className="font-display text-2xl text-ink">
              {editId ? "Edit supplier" : "Add supplier"}
            </h2>
            {formError ? <p className="mt-2 text-sm text-danger">{formError}</p> : null}
            <div className="mt-4 grid gap-3">
              {[
                ["name", "Business name", true],
                ["contactPerson", "Contact person", false],
                ["phone", "Phone", false],
                ["email", "Email", false],
                ["address", "Address", false],
              ].map(([key, label, required]) => (
                <label key={key} className="block text-sm">
                  <span className="text-muted">{label}</span>
                  <input
                    required={required}
                    type="text"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2"
                  />
                </label>
              ))}

              {!editId ? (
                <div className="rounded-xl border border-slate-line/80 bg-white/70 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Purana baqi (optional)
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Kul bill aur pehle se ada — baqi = kul − ada. Inventory link nahi.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="text-muted">Kul amount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.openingRemaining}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, openingRemaining: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2"
                        placeholder="0"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-muted">Pehle se ada</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.openingPaid}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, openingPaid: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2"
                        placeholder="0"
                      />
                    </label>
                    <label className="block text-sm sm:col-span-2">
                      <span className="text-muted">Date</span>
                      <input
                        type="date"
                        value={form.openingDate}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, openingDate: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2"
                      />
                    </label>
                    <label className="block text-sm sm:col-span-2">
                      <span className="text-muted">Note</span>
                      <input
                        type="text"
                        value={form.openingNote}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, openingNote: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2"
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="rounded-xl border border-slate-line px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {panel === "detail" && detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-mist p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-ink">{detail.supplier.name}</h2>
                <p className="text-sm text-muted">
                  Balance owed {formatCurrency(outstanding)} ·{" "}
                  {detail.stats?.purchaseCount || 0} purchases ·{" "}
                  {detail.stats?.transactionCount || ledgerRows.length} ledger rows
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="rounded-lg border border-slate-line px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-xl border border-brass/30 bg-brass/5 px-3 py-2 sm:col-span-1">
                <p className="text-[11px] uppercase tracking-wide text-muted">Balance owed</p>
                <p className="mt-0.5 font-medium tabular-nums">{formatCurrency(outstanding)}</p>
              </div>
              <div className="rounded-xl border border-slate-line/80 bg-white/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted">Phone</p>
                <p className="mt-0.5">{detail.supplier.phone || "—"}</p>
              </div>
              <div className="rounded-xl border border-slate-line/80 bg-white/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted">Contact</p>
                <p className="mt-0.5">{detail.supplier.contactPerson || "—"}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowLedgerForm((v) => !v);
                  setLedgerError("");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-brass/40 bg-brass/10 px-3 py-2 text-sm font-medium text-ink"
              >
                <Plus size={14} />
                {showLedgerForm ? "Hide ledger entry" : "Add ledger entry"}
              </button>
            </div>

            {showLedgerForm ? (
              <form
                onSubmit={submitLedgerEntry}
                className="mt-3 rounded-xl border border-brass/30 bg-white/90 p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Purana baqi (pehle se dena)
                </p>
                <p className="mt-1 text-xs text-muted">
                  Shop mein pehle se maujood maal ka hisab — Inventory ke baghair. Naya stock
                  add hone par ledger khud update hoga.
                </p>
                {ledgerError ? (
                  <p className="mt-2 text-sm text-danger">{ledgerError}</p>
                ) : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="text-muted">Kul amount</span>
                    <input
                      required
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
                      className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2"
                      placeholder="60000"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-muted">Pehle se ada</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ledgerForm.paidAmount}
                      onChange={(e) =>
                        setLedgerForm((f) => ({ ...f, paidAmount: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2"
                      placeholder="0"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-muted">Date</span>
                    <input
                      required
                      type="date"
                      value={ledgerForm.date}
                      onChange={(e) =>
                        setLedgerForm((f) => ({ ...f, date: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-muted">Note</span>
                    <input
                      type="text"
                      value={ledgerForm.note}
                      onChange={(e) =>
                        setLedgerForm((f) => ({ ...f, note: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2"
                      placeholder="Optional"
                    />
                  </label>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLedgerForm(false)}
                    className="rounded-xl border border-slate-line px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={ledgerSaving}
                    className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {ledgerSaving ? "Saving…" : "Save ledger entry"}
                  </button>
                </div>
              </form>
            ) : null}

            {outstanding > 0 ? (
              <form
                onSubmit={submitPayment}
                className="mt-4 rounded-xl border border-slate-line bg-white/80 p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Add payment
                </p>
                {payError ? <p className="mt-1 text-sm text-danger">{payError}</p> : null}
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <label className="text-sm">
                    <span className="text-muted">Amount</span>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={outstanding}
                      value={payForm.amount}
                      onChange={(e) =>
                        setPayForm((f) => ({ ...f, amount: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-muted">Date</span>
                    <input
                      required
                      type="date"
                      value={payForm.paymentDate}
                      onChange={(e) =>
                        setPayForm((f) => ({ ...f, paymentDate: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-muted">Note</span>
                    <input
                      type="text"
                      value={payForm.note}
                      onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2"
                      placeholder="Optional"
                    />
                  </label>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={paying}
                    className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {paying ? "Recording…" : "Record payment"}
                  </button>
                </div>
              </form>
            ) : null}

            <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted">
              Ledger
            </h3>
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-line/80">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-ink/90 text-white/90">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Remaining</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-muted">
                        No ledger transactions yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerRows.map((tx) => (
                      <tr
                        key={tx._id || tx.id}
                        className="border-t border-slate-line/60 bg-white/80"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          {tx.date ? formatDate(tx.date) : "—"}
                        </td>
                        <td className="px-3 py-2">{txTypeLabel(tx.type)}</td>
                        <td className="px-3 py-2 text-muted">{tx.paymentMethod || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(tx.paidAmount || 0)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(tx.remainingAmount || 0)}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted">{tx.note || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted">
              Linked purchases
            </h3>
            <div className="mt-2 space-y-2">
              {(detail.purchases || []).length === 0 ? (
                <p className="text-sm text-muted">No linked purchases yet.</p>
              ) : (
                detail.purchases.map((p) => (
                  <Link
                    key={p._id}
                    to={`/inventory/${p._id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-line bg-white/80 px-3 py-2 text-sm hover:border-brass/40"
                  >
                    <span>
                      {p.clothType} · {p.purchaseType}
                      {Number(p.outstandingAmount) > 0
                        ? ` · due ${formatCurrency(p.outstandingAmount)}`
                        : ""}
                    </span>
                    <span className="font-medium">{formatCurrency(p.purchaseAmount)}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title={`Archive ${archiveTarget?.name || "supplier"}?`}
        message="The supplier will be hidden from the live list. Purchase and ledger history will remain."
        confirmLabel="Archive supplier"
        cancelLabel="Keep"
        tone="danger"
        busy={archiveBusy}
        onCancel={() => {
          if (!archiveBusy) setArchiveTarget(null);
        }}
        onConfirm={() => void confirmArchive()}
      />
    </div>
  );
}
