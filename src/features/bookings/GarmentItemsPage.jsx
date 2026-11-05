import { useCallback, useEffect, useState } from "react";
import { Archive, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import { bookingApi } from "@/features/bookings/api";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { getErrorMessage } from "@/shared/api/client";

const emptyForm = () => ({ code: "", name: "" });

export function GarmentItemsPage() {
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
  const [panel, setPanel] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
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
      const data = await bookingApi.listGarmentItems({
        page,
        limit: 30,
        search,
        includeArchived: includeArchived || undefined,
      });
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load garments"));
    } finally {
      setLoading(false);
    }
  }, [page, search, includeArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormError("");
    setPanel(true);
  };

  const openEdit = (item) => {
    setEditId(item._id);
    setForm({ code: item.code || "", name: item.name || "" });
    setFormError("");
    setPanel(true);
  };

  const submit = async (e) => {
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
        ...(form.code.trim() ? { code: form.code.trim() } : {}),
      };
      if (editId) await bookingApi.updateGarmentItem(editId, payload);
      else await bookingApi.createGarmentItem(payload);
      setPanel(false);
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

  const runConfirm = async () => {
    if (!confirm?.item) return;
    setConfirmBusy(true);
    setError("");
    try {
      if (confirm.type === "archive") {
        await bookingApi.archiveGarmentItem(confirm.item._id);
      } else {
        await bookingApi.restoreGarmentItem(confirm.item._id);
      }
      setConfirm(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Update failed"));
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
          <h1 className="mt-2 font-display text-4xl text-ink">Garment types</h1>
          <p className="mt-1 text-sm text-muted">
            Codes and names used on bookings (e.g. Shalwar Kameez, Coat).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add garment
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
            placeholder="Search code or name…"
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
              <th className="px-3 py-2.5">Status</th>
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
                  No garment types found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item._id} className="border-t border-slate-line/60 bg-white/70">
                  <td className="px-3 py-2.5 font-mono text-xs">{item.code}</td>
                  <td className="px-3 py-2.5 font-medium">{item.name}</td>
                  <td className="px-3 py-2.5">
                    {item.isArchived ? (
                      <span className="text-muted">Archived</span>
                    ) : (
                      <span className="text-emerald-700">Active</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex gap-1">
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

      {panel ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <form
            onSubmit={submit}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl"
          >
            <h2 className="font-display text-2xl">
              {editId ? "Edit garment" : "New garment"}
            </h2>
            {formError ? (
              <p className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">{formError}</p>
            ) : null}
            <label className="block text-sm">
              <span className="text-muted">Code (optional — auto if blank)</span>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                maxLength={10}
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
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPanel(false)}
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

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.type === "restore"
            ? `Restore garment ${confirm?.item?.name || ""}?`
            : `Hide garment ${confirm?.item?.name || ""}?`
        }
        message={
          confirm?.type === "restore"
            ? "The garment will show again when creating bookings."
            : "The garment will be hidden from new bookings. History is kept."
        }
        confirmLabel={confirm?.type === "restore" ? "Restore" : "Hide garment"}
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
