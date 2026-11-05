import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { bookingApi } from "@/features/bookings/api";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { getErrorMessage } from "@/shared/api/client";
import { formatCurrency, toInputDate } from "@/shared/lib/format";

const emptyForm = () => ({
  name: "",
  phone1: "",
  phone2: "",
  address: "",
  address2: "",
  notes: "",
  openingRemaining: "",
  openingPaid: "",
  openingDate: toInputDate(new Date()),
  openingCategory: "GENERAL",
  openingNote: "",
});

export function CustomersPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [panel, setPanel] = useState(null); // "create" | "edit"
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await bookingApi.listCustomers({ page, limit: 20, search });
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load customers"));
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
    setPanel("create");
  };

  const openEdit = (customer) => {
    setEditId(customer._id);
    setForm({
      name: customer.name || "",
      phone1: customer.phone1 || "",
      phone2: customer.phone2 || "",
      address: customer.address || "",
      address2: customer.address2 || "",
      notes: customer.notes || "",
    });
    setFormError("");
    setPanel("edit");
  };

  const save = async () => {
    if (!form.name.trim()) {
      setFormError("Customer name is required");
      return;
    }
    setSaving(true);
    setFormError("");
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim(),
        address: form.address.trim(),
        address2: form.address2.trim(),
        notes: form.notes.trim(),
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
          if (paid > kul && kul > 0) {
            setFormError("Pehle se ada cannot exceed kul amount");
            setSaving(false);
            return;
          }
          payload.openingBalance = {
            totalAmount: kul > 0 ? kul : paid,
            paidAmount: paid,
            date: form.openingDate,
            category: form.openingCategory || "GENERAL",
            note: form.openingNote || undefined,
          };
        }
      }
      if (editId) await bookingApi.updateCustomer(editId, payload);
      else await bookingApi.createCustomer(payload);
      setPanel(null);
      setEditId(null);
      setForm(emptyForm());
      if (!editId) setPage(1);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Stitching · Customers
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Customers</h1>
          <p className="mt-1 text-sm text-muted">
            Search by name, phone, or code. Use View / Edit / Delete on each row.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          New customer
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          placeholder="Name, phone, code…"
          className="w-full rounded-xl border border-slate-line bg-white py-2.5 pl-9 pr-3 text-sm"
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
              <th className="px-3 py-2.5">Code</th>
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Phone</th>
              <th className="px-3 py-2.5">Address</th>
              <th className="px-3 py-2.5 text-right">Balance</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  No customers yet. Run legacy migration or add a customer.
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c._id} className="border-t border-slate-line/70 bg-white/70">
                  <td className="px-3 py-2.5 font-medium">
                    <Link to={`/customers/${c._id}`} className="hover:underline">
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{c.name}</td>
                  <td className="px-3 py-2.5">{c.phone1 || "—"}</td>
                  <td className="px-3 py-2.5">{c.address || "—"}</td>
                  <td className="px-3 py-2.5 text-right font-medium">
                    {formatCurrency(c.balance || c.outstandingBalance || 0)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        title="View details"
                        onClick={() => navigate(`/customers/${c._id}`)}
                        className="rounded-lg border border-slate-line px-2 py-1.5 hover:bg-mist"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => openEdit(c)}
                        className="rounded-lg border border-slate-line px-2 py-1.5 hover:bg-mist"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => setDeleteTarget(c)}
                        className="rounded-lg border border-danger/40 px-2 py-1.5 text-danger hover:bg-danger/5"
                      >
                        <Trash2 size={14} />
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

      {panel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-mist p-5 shadow-xl">
            <h3 className="font-display text-2xl">
              {editId ? "Edit customer" : "New customer"}
            </h3>
            {formError ? (
              <p className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            ) : null}
            <label className="block text-sm">
              <span className="text-muted">Full name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                required
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted">Phone 1</span>
                <input
                  value={form.phone1}
                  onChange={(e) => setForm((f) => ({ ...f, phone1: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">Phone 2</span>
                <input
                  value={form.phone2}
                  onChange={(e) => setForm((f) => ({ ...f, phone2: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-muted">Address</span>
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Address 2</span>
              <input
                value={form.address2}
                onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
              />
            </label>
            {!editId ? (
              <div className="space-y-2 rounded-xl border border-slate-line/70 bg-white/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Opening balance (optional)
                </p>
                <p className="text-xs text-muted">
                  Legacy has customers + bookings only (no sales money). Enter
                  purana baqi here. Baqi = kul − pehle se ada.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-muted">Kul hisab</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.openingRemaining}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, openingRemaining: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
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
                      className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-muted">Date</span>
                    <input
                      type="date"
                      value={form.openingDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, openingDate: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-muted">Category</span>
                    <select
                      value={form.openingCategory}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, openingCategory: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                    >
                      <option value="GENERAL">General</option>
                      <option value="GARMENT">Garment (POS)</option>
                      <option value="STITCHING">Stitching</option>
                    </select>
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="text-muted">Note</span>
                  <input
                    value={form.openingNote}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, openingNote: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPanel(null);
                  setEditId(null);
                }}
                className="rounded-xl border border-slate-line px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete customer ${deleteTarget?.name || ""}`}
        message={`Code ${deleteTarget?.code || ""}. The customer will be archived and hidden from the list. Bookings history is kept.`}
        confirmLabel="Delete customer"
        cancelLabel="Keep"
        tone="danger"
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleteBusy(true);
          setError("");
          try {
            await bookingApi.archiveCustomer(deleteTarget._id);
            setDeleteTarget(null);
            await load();
          } catch (err) {
            setError(getErrorMessage(err, "Delete failed"));
          } finally {
            setDeleteBusy(false);
          }
        }}
      />
    </div>
  );
}
