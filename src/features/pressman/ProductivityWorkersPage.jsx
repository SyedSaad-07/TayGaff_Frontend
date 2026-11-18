import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { accessoriesApi, pressmanApi } from "@/features/pressman/api";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { getErrorMessage } from "@/shared/api/client";
import { isAdmin } from "@/features/auth/roles";
import { useAuth } from "@/features/auth/AuthContext";
import { useBranch } from "@/features/branches/BranchContext";
import { formatCurrency, formatDate, toInputDate } from "@/shared/lib/format";

/**
 * Shared UI for Pressman and Accessories modules.
 * kind: "pressman" | "accessories"
 */
export function ProductivityWorkersPage({ kind }) {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const api = kind === "accessories" ? accessoriesApi : pressmanApi;
  const title = kind === "accessories" ? "Accessories" : "Pressman";
  const detailBase = kind === "accessories" ? "/accessories" : "/pressmen";
  const { branches, queryBranchId, createBranchId, needsCreateBranchPicker } =
    useBranch();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    isActive: true,
    branch: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await api.list({
        includeInactive: true,
        branchId: queryBranchId,
      });
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(getErrorMessage(err, `Failed to load ${title}`));
    } finally {
      setLoading(false);
    }
  }, [api, title, queryBranchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!editId && !form.branch) {
      setError("Select a branch");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editId) {
        const { branch: _branch, ...updatePayload } = form;
        await api.update(editId, updatePayload);
      } else {
        await api.create({ ...form, branch: form.branch });
      }
      setPanel(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Productivity
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">{title}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditId(null);
            setForm({
              name: "",
              phone: "",
              isActive: true,
              branch: createBranchId,
            });
            setPanel("form");
          }}
          className="inline-flex items-center gap-1 rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add
        </button>
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
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const id = item._id || item.id;
                return (
                  <tr key={id} className="border-b border-slate-line/50">
                    <td className="px-4 py-3">
                      <Link
                        to={`${detailBase}/${id}`}
                        className="font-medium text-brass-deep hover:underline"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{item.phone || "—"}</td>
                    <td className="px-4 py-3">{item.isActive ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(id);
                            setForm({
                              name: item.name || "",
                              phone: item.phone || "",
                              isActive: item.isActive !== false,
                              branch: item.branchId || item.branch?._id || "",
                            });
                            setPanel("form");
                          }}
                          className="rounded-lg border border-slate-line p-1.5"
                        >
                          <Pencil size={14} />
                        </button>
                        {admin ? (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({ id, title: `Move ${item.name} to trash` })
                            }
                            className="rounded-lg border border-danger/40 p-1.5 text-danger"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!items.length ? (
            <p className="px-4 py-6 text-sm text-muted">No people yet.</p>
          ) : null}
        </div>
      )}

      {panel === "form" ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5">
            <h2 className="font-display text-2xl">{editId ? "Edit" : "Add"}</h2>
            {!editId && needsCreateBranchPicker ? (
              <label className="block text-sm">
                <span className="text-muted">Branch</span>
                <select
                  required
                  value={form.branch}
                  onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2"
                >
                  <option value="" disabled>
                    Select branch
                  </option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                      {branch.code ? ` (${branch.code})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="text-muted">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              Active
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white"
              >
                Save
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
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title || "Confirm"}
        message="Soft-delete this person into Trash."
        confirmLabel="Move to trash"
        cancelLabel="Cancel"
        tone="danger"
        busy={confirmBusy}
        onCancel={() => !confirmBusy && setConfirm(null)}
        onConfirm={async () => {
          setConfirmBusy(true);
          try {
            await api.remove(confirm.id);
            setConfirm(null);
            await load();
          } catch (err) {
            setError(getErrorMessage(err, "Delete failed"));
          } finally {
            setConfirmBusy(false);
          }
        }}
      />
    </div>
  );
}

export function ProductivityDetailPage({ kind }) {
  const { id } = useParams();
  const { user } = useAuth();
  const admin = isAdmin(user);
  const api = kind === "accessories" ? accessoriesApi : pressmanApi;
  const title = kind === "accessories" ? "Accessories" : "Pressman";
  const listPath = kind === "accessories" ? "/accessories" : "/pressmen";
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [form, setForm] = useState({
    date: toInputDate(new Date()),
    clothCount: "1",
    amountPayable: "",
    notes: "",
    paidAt: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listEntries(id, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setBundle(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load entries"));
    } finally {
      setLoading(false);
    }
  }, [api, id, startDate, endDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const person = kind === "accessories" ? bundle?.worker : bundle?.pressman;
  const items = bundle?.items || [];
  const totals = bundle?.totals || { cloths: 0, amount: 0, unpaidAmount: 0 };

  const addEntry = async () => {
    setSaving(true);
    setError("");
    try {
      await api.createEntry(id, {
        date: form.date,
        clothCount: Number(form.clothCount) || 0,
        amountPayable: Number(form.amountPayable) || 0,
        notes: form.notes,
        paidAt: form.paidAt || null,
      });
      setForm({
        date: toInputDate(new Date()),
        clothCount: "1",
        amountPayable: "",
        notes: "",
        paidAt: "",
      });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not add entry"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to={listPath} className="text-sm text-muted hover:text-ink">
        ← {title}
      </Link>
      <div>
        <h1 className="font-display text-4xl text-ink">{person?.name || "…"}</h1>
        <p className="mt-1 text-sm text-muted">{person?.phone || ""}</p>
        {admin ? (
          <p className="mt-2 text-sm">
            Cloths {totals.cloths} · Payable {formatCurrency(totals.amount)} ·
            Unpaid {formatCurrency(totals.unpaidAmount)}
          </p>
        ) : (
          <p className="mt-2 text-sm">Cloths {totals.cloths}</p>
        )}
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

      <section className="rounded-2xl border border-slate-line bg-white p-4">
        <h2 className="font-display text-xl">Add entry</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="rounded-xl border border-slate-line px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            value={form.clothCount}
            onChange={(e) => setForm((f) => ({ ...f, clothCount: e.target.value }))}
            placeholder="Cloths"
            className="rounded-xl border border-slate-line px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amountPayable}
            onChange={(e) =>
              setForm((f) => ({ ...f, amountPayable: e.target.value }))
            }
            placeholder="Amount payable"
            className="rounded-xl border border-slate-line px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.paidAt}
            onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))}
            title="Paid date (empty = unpaid)"
            className="rounded-xl border border-slate-line px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={saving}
            onClick={addEntry}
            className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white"
          >
            Add
          </button>
        </div>
        <input
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Notes"
          className="mt-2 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
        />
      </section>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-line text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Cloths</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const entryId = row._id || row.id;
                return (
                  <tr key={entryId} className="border-b border-slate-line/50">
                    <td className="px-4 py-3">
                      {row.date ? formatDate(row.date) : "—"}
                    </td>
                    <td className="px-4 py-3">{row.clothCount}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(row.amountPayable || 0)}
                    </td>
                    <td className="px-4 py-3">
                      {row.paidAt ? formatDate(row.paidAt) : "Unpaid"}
                    </td>
                    <td className="px-4 py-3">{row.notes || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api.deleteEntry(id, entryId);
                            await load();
                          } catch (err) {
                            setError(getErrorMessage(err, "Delete failed"));
                          }
                        }}
                        className="text-danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!items.length ? (
            <p className="px-4 py-6 text-sm text-muted">No entries yet.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
