import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { branchApi } from "@/features/branches/api";
import { useBranch } from "@/features/branches/BranchContext";
import { ApiError } from "@/shared/api/client";

const emptyForm = {
  name: "",
  code: "",
  address: "",
};

export function BranchesPage() {
  const { branches, refreshBranches, setSelectedBranchId } = useBranch();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      address: form.address.trim(),
    };

    try {
      if (editingId) {
        await branchApi.update(editingId, payload);
      } else {
        const created = await branchApi.create(payload);
        await refreshBranches();
        setSelectedBranchId(created._id);
        resetForm();
        setSaving(false);
        return;
      }
      await refreshBranches();
      resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save branch");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (branch) => {
    setEditingId(branch._id);
    setForm({
      name: branch.name || "",
      code: branch.code || "",
      address: branch.address || "",
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this branch?")) return;
    try {
      await branchApi.remove(id);
      await refreshBranches();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to delete branch");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
          Locations
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink sm:text-5xl">
          Branches
        </h1>
        <p className="mt-2 text-sm text-ink/55">
          Create shop branches so expenses stay tied to the right location.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-2xl border border-slate-line/80 bg-mist/80 p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="text-xs font-medium text-ink/60">
          Branch name
          <input
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
            placeholder="e.g. Clifton Outlet"
          />
        </label>
        <label className="text-xs font-medium text-ink/60">
          Code
          <input
            value={form.code}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
            placeholder="Optional short code"
          />
        </label>
        <label className="text-xs font-medium text-ink/60 sm:col-span-2 lg:col-span-1">
          Address
          <input
            value={form.address}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, address: e.target.value }))
            }
            className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
            placeholder="Optional address"
          />
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brass-deep disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : editingId
                ? "Update branch"
                : "Create branch"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-line px-4 py-2.5 text-sm font-medium text-ink/70"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {error ? (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-line/80 bg-mist/80">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-canvas/80 text-xs uppercase tracking-wide text-ink/45">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Address</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-ink/45">
                    No branches yet. Create your first branch above.
                  </td>
                </tr>
              ) : (
                branches.map((branch) => (
                  <tr key={branch._id} className="border-t border-slate-line/70">
                    <td className="px-5 py-3 font-medium">{branch.name}</td>
                    <td className="px-5 py-3 text-ink/70">{branch.code || "—"}</td>
                    <td className="max-w-xs truncate px-5 py-3 text-ink/60">
                      {branch.address || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(branch)}
                          className="rounded-lg border border-slate-line p-2 text-ink/60 transition hover:text-ink"
                          aria-label="Edit branch"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete(branch._id)}
                          className="rounded-lg border border-slate-line p-2 text-danger/70 transition hover:text-danger"
                          aria-label="Delete branch"
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
      </div>
    </div>
  );
}
