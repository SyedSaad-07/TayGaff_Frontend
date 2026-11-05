import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { bookingApi } from "@/features/bookings/api";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { getErrorMessage } from "@/shared/api/client";

export function BookingStatusesSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState(null);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [originalName, setOriginalName] = useState("");
  const [renameConfirm, setRenameConfirm] = useState(null);
  const [renameBusy, setRenameBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await bookingApi.listStatuses());
    } catch (err) {
      setError(
        getErrorMessage(err, "Failed to load statuses")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setName("");
    setOriginalName("");
    setFormError("");
    setPanel("create");
  };

  const openEdit = (row) => {
    setEditId(row._id);
    setName(row.name || "");
    setOriginalName(row.name || "");
    setFormError("");
    setPanel("edit");
  };

  const persist = async (payload) => {
    setSaving(true);
    setFormError("");
    try {
      if (editId) {
        await bookingApi.updateStatus(editId, payload);
      } else {
        await bookingApi.createStatus(payload);
      }
      setPanel(null);
      setEditId(null);
      setName("");
      setOriginalName("");
      setRenameConfirm(null);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
      setRenameBusy(false);
    }
  };

  const save = async () => {
    const next = name.trim();
    if (!next) {
      setFormError("Status name is required");
      return;
    }
    // Renaming cascades to every booking with the old status — confirm first.
    if (editId && originalName && next !== originalName) {
      setRenameConfirm({ from: originalName, to: next });
      return;
    }
    await persist({ name: next });
  };

  const confirmRename = async () => {
    if (!renameConfirm) return;
    setRenameBusy(true);
    await persist({ name: renameConfirm.to });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await bookingApi.deleteStatus(deleteTarget._id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Delete failed"));
      setDeleteTarget(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-line/80 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass-deep">
            Workflow
          </p>
          <h2 className="mt-1 font-display text-2xl text-ink">
            Booking statuses
          </h2>
          <p className="mt-1 text-sm text-muted">
            Manage the status options used when updating bookings. Renaming
            updates existing bookings; deleting only removes the option from the
            list (booking history stays as-is).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add status
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading statuses…</p>
      ) : (
        <ul className="divide-y divide-slate-line/60 rounded-xl border border-slate-line/70">
          {items.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted">No statuses yet.</li>
          ) : (
            items.map((row) => (
              <li
                key={row._id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <span className="font-medium text-ink">{row.name}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-brass-deep hover:underline"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(row)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-danger hover:underline"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      )}

      {panel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-mist p-5 shadow-xl">
            <div className="flex items-center gap-2">
              <Tags size={18} className="text-brass" />
              <h3 className="font-display text-2xl text-ink">
                {editId ? "Edit status" : "Add status"}
              </h3>
            </div>
            {editId ? (
              <p className="text-sm text-muted">
                Renaming will update this status on all current bookings.
              </p>
            ) : (
              <p className="text-sm text-muted">
                Adding a status does not change existing bookings.
              </p>
            )}

            {formError ? (
              <p className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            ) : null}

            <label className="block text-sm">
              <span className="text-muted">Status name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                placeholder="e.g. Pressing"
              />
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={saving}
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
                onClick={() => void save()}
                className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : editId ? "Save changes" : "Create status"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete status option?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed from the selectable list. Existing bookings keep this status value unchanged.`
            : ""
        }
        confirmLabel="Delete"
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />

      <ConfirmDialog
        open={Boolean(renameConfirm)}
        title="Rename status on all bookings?"
        message={
          renameConfirm
            ? `This will change every booking currently marked "${renameConfirm.from}" to "${renameConfirm.to}". Add a new status instead if you only want a new option.`
            : ""
        }
        confirmLabel="Rename everywhere"
        tone="danger"
        busy={renameBusy || saving}
        onCancel={() => setRenameConfirm(null)}
        onConfirm={() => void confirmRename()}
      />
    </section>
  );
}
