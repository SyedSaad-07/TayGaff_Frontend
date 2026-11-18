import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { bookingApi } from "@/features/bookings/api";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { getErrorMessage } from "@/shared/api/client";
import { isAdmin } from "@/features/auth/roles";
import { useAuth } from "@/features/auth/AuthContext";
import { useBranch } from "@/features/branches/BranchContext";
import { formatCurrency } from "@/shared/lib/format";

const emptyCutter = () => ({
  branch: "",
  code: "",
  name: "",
  phone1: "",
  phone2: "",
  address: "",
  address2: "",
});

const emptyRate = () => ({ itemCode: "", rate: "" });

export function CuttersPage() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const { branches, queryBranchId, createBranchId, needsCreateBranchPicker } =
    useBranch();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyCutter);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [garmentItems, setGarmentItems] = useState([]);
  const [activeCutter, setActiveCutter] = useState(null);
  const [rates, setRates] = useState([]);
  const [rateForm, setRateForm] = useState(emptyRate);
  const [editingRateId, setEditingRateId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await bookingApi.listCutters({
        page,
        limit: 30,
        search,
        includeArchived: includeArchived || undefined,
        branchId: queryBranchId,
      });
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load cutters"));
    } finally {
      setLoading(false);
    }
  }, [page, search, includeArchived, queryBranchId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const list = await bookingApi.garmentItems();
        setGarmentItems(Array.isArray(list) ? list : []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyCutter(), branch: createBranchId });
    setFormError("");
    setPanel("form");
  };

  const openEdit = (item) => {
    setEditId(item._id || item.id);
    setForm({
      code: item.code || "",
      name: item.name || "",
      phone1: item.phone1 || "",
      phone2: item.phone2 || "",
      address: item.address || "",
      address2: item.address2 || "",
    });
    setFormError("");
    setPanel("form");
  };

  const openRates = async (item) => {
    setError("");
    setFormError("");
    setRateForm(emptyRate());
    setEditingRateId(null);
    try {
      const data = await bookingApi.getCutter(item._id || item.id);
      setActiveCutter(data.cutter || data);
      setRates(data.rates || []);
      setPanel("rates");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load rates"));
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (!editId && !form.branch) {
      setFormError("Select a branch for this cutter");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name.trim(),
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim(),
        address: form.address.trim(),
        address2: form.address2.trim(),
        ...(form.code.trim() ? { code: form.code.trim() } : {}),
        ...(!editId && form.branch ? { branch: form.branch } : {}),
      };
      if (editId) await bookingApi.updateCutter(editId, payload);
      else await bookingApi.createCutter(payload);
      setPanel(null);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const submitRate = async (e) => {
    e.preventDefault();
    if (!activeCutter) return;
    const rate = Number(rateForm.rate);
    if (!rateForm.itemCode || !(rate >= 0)) {
      setFormError("Select a garment and enter a rate");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (editingRateId) {
        await bookingApi.updateCutterRate(editingRateId, {
          itemCode: rateForm.itemCode,
          rate,
        });
      } else {
        await bookingApi.createCutterRate({
          cutterCode: activeCutter.code,
          itemCode: rateForm.itemCode,
          rate,
        });
      }
      const data = await bookingApi.getCutter(activeCutter._id || activeCutter.id);
      setRates(data.rates || []);
      setRateForm(emptyRate());
      setEditingRateId(null);
    } catch (err) {
      setFormError(getErrorMessage(err, "Rate save failed"));
    } finally {
      setSaving(false);
    }
  };

  const editRate = (rate) => {
    setEditingRateId(rate._id || rate.id);
    setRateForm({
      itemCode: rate.itemCode || "",
      rate: String(rate.rate ?? ""),
    });
    setFormError("");
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    setError("");
    setFormError("");
    try {
      if (confirm.action === "archive") {
        await bookingApi.archiveCutter(confirm.id);
        await load();
      } else if (confirm.action === "restore") {
        await bookingApi.restoreCutter(confirm.id);
        await load();
      } else if (confirm.action === "trash") {
        await bookingApi.softDeleteCutter(confirm.id);
        await load();
      } else if (confirm.action === "deleteRate") {
        await bookingApi.deleteCutterRate(confirm.id);
        setRates((prev) =>
          prev.filter((r) => String(r._id || r.id) !== String(confirm.id))
        );
      }
      setConfirm(null);
    } catch (err) {
      if (confirm.action === "deleteRate") {
        setFormError(getErrorMessage(err, "Could not delete rate"));
      } else {
        setError(getErrorMessage(err, "Action failed"));
      }
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Workshop
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Cutters</h1>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1 rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add cutter
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Search cutters"
            className="w-full rounded-xl border border-slate-line py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => {
              setIncludeArchived(e.target.checked);
              setPage(1);
            }}
          />
          Show archived
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Open items</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id || item.id} className="border-b border-slate-line/60">
                  <td className="px-4 py-3 font-medium">{item.code}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/cutters/${item._id || item.id}`}
                      className="text-brass-deep hover:underline"
                    >
                      {item.name}
                    </Link>
                    {item.isArchived ? (
                      <span className="ml-2 text-xs text-muted">(archived)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{item.phone1 || "—"}</td>
                  <td className="px-4 py-3">{item.openAssignedCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => void openRates(item)}
                        className="rounded-lg border border-slate-line px-2 py-1.5 text-xs font-medium hover:bg-mist"
                      >
                        Rates
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="rounded-lg border border-slate-line p-1.5"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      {item.isArchived ? (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirm({
                              action: "restore",
                              id: item._id || item.id,
                              title: `Restore ${item.name}`,
                            })
                          }
                          className="rounded-lg border border-slate-line p-1.5"
                        >
                          <RotateCcw size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirm({
                              action: "archive",
                              id: item._id || item.id,
                              title: `Archive ${item.name}`,
                            })
                          }
                          className="rounded-lg border border-slate-line p-1.5"
                        >
                          <Archive size={14} />
                        </button>
                      )}
                      {admin ? (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirm({
                              action: "trash",
                              id: item._id || item.id,
                              title: `Move ${item.name} to trash`,
                            })
                          }
                          className="rounded-lg border border-danger/40 p-1.5 text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length ? (
            <p className="px-4 py-6 text-sm text-muted">No cutters yet.</p>
          ) : null}
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">
          Page {pagination.page} of {pagination.totalPages || 1} · {pagination.total || 0}{" "}
          total
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

      {panel === "form" ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg space-y-3 rounded-2xl bg-white p-5">
            <h2 className="font-display text-2xl">
              {editId ? "Edit cutter" : "New cutter"}
            </h2>
            {formError ? <p className="text-sm text-danger">{formError}</p> : null}
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
            {["code", "name", "phone1", "phone2", "address", "address2"].map((key) => (
              <label key={key} className="block text-sm">
                <span className="capitalize text-muted">{key}</span>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                />
              </label>
            ))}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white"
              >
                {saving ? "Saving…" : "Save"}
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

      {panel === "rates" && activeCutter ? (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-ink/40 p-4">
          <div className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-3xl">Piece rates</h2>
                <p className="mt-1 text-sm text-muted">
                  {activeCutter.code} · {activeCutter.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPanel(null);
                  setActiveCutter(null);
                  setRates([]);
                }}
                className="rounded-xl border border-slate-line px-3 py-1.5 text-sm"
              >
                Close
              </button>
            </div>

            {formError ? <p className="text-sm text-danger">{formError}</p> : null}

            <form
              onSubmit={submitRate}
              className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-line bg-mist/40 p-3"
            >
              <label className="min-w-[180px] flex-1 text-sm">
                <span className="text-muted">Garment</span>
                <select
                  value={rateForm.itemCode}
                  onChange={(e) =>
                    setRateForm((f) => ({ ...f, itemCode: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-line bg-white px-2 py-2"
                  required
                >
                  <option value="">Select…</option>
                  {garmentItems.map((g) => (
                    <option key={g._id || g.id || g.code} value={g.code}>
                      {g.code} · {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="w-32 text-sm">
                <span className="text-muted">Rate</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rateForm.rate}
                  onChange={(e) => setRateForm((f) => ({ ...f, rate: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-line px-2 py-2"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {editingRateId ? "Update" : "Add rate"}
              </button>
              {editingRateId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRateId(null);
                    setRateForm(emptyRate());
                  }}
                  className="rounded-xl border border-slate-line px-3 py-2 text-sm"
                >
                  Cancel edit
                </button>
              ) : null}
            </form>

            <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-line text-muted">
                <tr>
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2">Rate</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rates.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-6 text-center text-muted">
                      No rates yet for this cutter.
                    </td>
                  </tr>
                ) : (
                  rates.map((rate) => (
                    <tr
                      key={rate._id || rate.id}
                      className="border-t border-slate-line/50"
                    >
                      <td className="px-2 py-2">
                        <span className="font-mono text-xs">{rate.itemCode}</span>
                        {rate.garmentItem?.name ? (
                          <span className="ml-2 text-muted">
                            {rate.garmentItem.name}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 font-medium">
                        {formatCurrency(rate.rate)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => editRate(rate)}
                          className="mr-1 rounded-lg border border-slate-line px-2 py-1 hover:bg-mist"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirm({
                              action: "deleteRate",
                              id: rate._id || rate.id,
                              title: `Delete rate for ${rate.itemCode}?`,
                            })
                          }
                          className="rounded-lg border border-slate-line px-2 py-1 hover:bg-mist"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title || "Confirm"}
        message={
          confirm?.action === "trash"
            ? "Soft-delete only. Historical item links stay intact."
            : confirm?.action === "deleteRate"
              ? "This rate will be removed from the cutter’s price list."
              : "Continue?"
        }
        confirmLabel={
          confirm?.action === "deleteRate" ? "Delete rate" : "Confirm"
        }
        cancelLabel="Cancel"
        tone={
          confirm?.action === "trash" || confirm?.action === "deleteRate"
            ? "danger"
            : "default"
        }
        busy={confirmBusy}
        onCancel={() => !confirmBusy && setConfirm(null)}
        onConfirm={runConfirm}
      />
    </div>
  );
}
