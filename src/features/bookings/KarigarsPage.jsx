import { useCallback, useEffect, useState } from "react";
import { Archive, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { bookingApi } from "@/features/bookings/api";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { getErrorMessage } from "@/shared/api/client";
import { formatCurrency } from "@/shared/lib/format";

const emptyKarigar = () => ({
  code: "",
  name: "",
  phone1: "",
  phone2: "",
  address: "",
  address2: "",
});

const emptyRate = () => ({ itemCode: "", rate: "" });

export function KarigarsPage() {
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

  const [panel, setPanel] = useState(null); // form | rates
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyKarigar);

  const [garmentItems, setGarmentItems] = useState([]);
  const [activeKarigar, setActiveKarigar] = useState(null);
  const [rates, setRates] = useState([]);
  const [rateForm, setRateForm] = useState(emptyRate);
  const [editingRateId, setEditingRateId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await bookingApi.listKarigars({
        page,
        limit: 30,
        search,
        includeArchived: includeArchived || undefined,
      });
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load karigars"));
    } finally {
      setLoading(false);
    }
  }, [page, search, includeArchived]);

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
    setForm(emptyKarigar());
    setFormError("");
    setPanel("form");
  };

  const openEdit = (item) => {
    setEditId(item._id);
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
      const data = await bookingApi.getKarigar(item._id);
      setActiveKarigar(data.karigar);
      setRates(data.rates || []);
      setPanel("rates");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load rates"));
    }
  };

  const submitKarigar = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Name is required");
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
      };
      if (editId) await bookingApi.updateKarigar(editId, payload);
      else await bookingApi.createKarigar(payload);
      setPanel(null);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const askToggleArchive = (item) => {
    setConfirm({
      type: item.isArchived ? "restore" : "archive",
      item,
    });
  };

  const submitRate = async (e) => {
    e.preventDefault();
    if (!activeKarigar) return;
    const rate = Number(rateForm.rate);
    if (!rateForm.itemCode || !(rate >= 0)) {
      setFormError("Select a garment and enter a rate");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (editingRateId) {
        await bookingApi.updateKarigarRate(editingRateId, {
          itemCode: rateForm.itemCode,
          rate,
        });
      } else {
        await bookingApi.createKarigarRate({
          karigarCode: activeKarigar.code,
          itemCode: rateForm.itemCode,
          rate,
        });
      }
      const data = await bookingApi.getKarigar(activeKarigar._id);
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
    setEditingRateId(rate._id);
    setRateForm({
      itemCode: rate.itemCode || "",
      rate: String(rate.rate ?? ""),
    });
    setFormError("");
  };

  const askRemoveRate = (rate) => {
    setConfirm({ type: "deleteRate", item: rate });
  };

  const runConfirm = async () => {
    if (!confirm?.item) return;
    setConfirmBusy(true);
    setError("");
    setFormError("");
    try {
      if (confirm.type === "archive") {
        await bookingApi.archiveKarigar(confirm.item._id);
        await load();
      } else if (confirm.type === "restore") {
        await bookingApi.restoreKarigar(confirm.item._id);
        await load();
      } else if (confirm.type === "deleteRate") {
        await bookingApi.deleteKarigarRate(confirm.item._id);
        setRates((prev) => prev.filter((r) => r._id !== confirm.item._id));
      }
      setConfirm(null);
    } catch (err) {
      if (confirm.type === "deleteRate") {
        setFormError(getErrorMessage(err, "Delete failed"));
      } else {
        setError(getErrorMessage(err, "Update failed"));
      }
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Tailoring · Masters
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Karigars</h1>
          <p className="mt-1 text-sm text-muted">
            Tailors and piece rates per garment type.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add karigar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Search code, name, phone…"
            className="w-full rounded-xl border border-slate-line bg-white py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/70">
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
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted">
                  No karigars found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item._id} className="border-t border-slate-line/60 bg-white/70">
                  <td className="px-3 py-2.5 font-mono text-xs">{item.code}</td>
                  <td className="px-3 py-2.5 font-medium">{item.name}</td>
                  <td className="px-3 py-2.5">{item.phone1 || "—"}</td>
                  <td className="px-3 py-2.5">
                    {item.isArchived ? (
                      <span className="text-muted">Archived</span>
                    ) : (
                      <span className="text-emerald-700">Active</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openRates(item)}
                        className="rounded-lg border border-slate-line px-2 py-1.5 text-xs font-medium hover:bg-mist"
                      >
                        Rates
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="rounded-lg border border-slate-line px-2 py-1.5 hover:bg-mist"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => askToggleArchive(item)}
                        className="rounded-lg border border-slate-line px-2 py-1.5 hover:bg-mist"
                        title={item.isArchived ? "Restore" : "Archive"}
                      >
                        {item.isArchived ? <RotateCcw size={14} /> : <Archive size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted">{pagination.total} total</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-line px-3 py-1.5 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-2 py-1.5">
              {page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-line px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {panel === "form" ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <form
            onSubmit={submitKarigar}
            className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
          >
            <h2 className="font-display text-2xl">
              {editId ? "Edit karigar" : "New karigar"}
            </h2>
            {formError ? (
              <p className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">{formError}</p>
            ) : null}
            <label className="block text-sm">
              <span className="text-muted">Code (optional)</span>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                required
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted">Phone 1</span>
                <input
                  value={form.phone1}
                  onChange={(e) => setForm((f) => ({ ...f, phone1: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">Phone 2</span>
                <input
                  value={form.phone2}
                  onChange={(e) => setForm((f) => ({ ...f, phone2: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                />
              </label>
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
                onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
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
                className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {panel === "rates" && activeKarigar ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">Piece rates</h2>
                <p className="text-sm text-muted">
                  {activeKarigar.code} · {activeKarigar.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="rounded-xl border border-slate-line px-3 py-1.5 text-sm"
              >
                Close
              </button>
            </div>

            {formError ? (
              <p className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">{formError}</p>
            ) : null}

            <form onSubmit={submitRate} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-line bg-mist/40 p-3">
              <label className="min-w-[160px] flex-1 text-sm">
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
                    <option key={g._id} value={g.code}>
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
                      No rates yet for this karigar.
                    </td>
                  </tr>
                ) : (
                  rates.map((rate) => (
                    <tr key={rate._id} className="border-t border-slate-line/50">
                      <td className="px-2 py-2">
                        <span className="font-mono text-xs">{rate.itemCode}</span>
                        {rate.garmentItem?.name ? (
                          <span className="ml-2 text-muted">{rate.garmentItem.name}</span>
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
                          onClick={() => askRemoveRate(rate)}
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
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.type === "deleteRate"
            ? `Delete rate for ${confirm?.item?.itemCode || "item"}?`
            : confirm?.type === "restore"
              ? `Restore karigar ${confirm?.item?.name || ""}?`
              : `Hide karigar ${confirm?.item?.name || ""}?`
        }
        message={
          confirm?.type === "deleteRate"
            ? "This rate will be removed from the karigar’s price list."
            : confirm?.type === "restore"
              ? "The karigar will show again when creating bookings."
              : "The karigar will be hidden from new bookings. History is kept."
        }
        confirmLabel={
          confirm?.type === "deleteRate"
            ? "Delete rate"
            : confirm?.type === "restore"
              ? "Restore"
              : "Hide karigar"
        }
        cancelLabel="Cancel"
        tone={confirm?.type === "restore" ? "default" : "danger"}
        busy={confirmBusy}
        onCancel={() => {
          if (!confirmBusy) setConfirm(null);
        }}
        onConfirm={() => void runConfirm()}
      />
    </div>
  );
}
