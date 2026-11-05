import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { expenseApi } from "@/features/expenses/api";
import { useBranch } from "@/features/branches/BranchContext";
import { ALL_BRANCHES } from "@/features/branches/branchUtils";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { getErrorMessage } from "@/shared/api/client";
import {
  CATEGORY_COLORS,
  formatCurrency,
  formatDate,
  toInputDate,
} from "@/shared/lib/format";
import { EXPENSE_TYPES } from "@/shared/constants";

export function ExpensesPage() {
  const {
    branches,
    selectedBranchId,
    selectedBranch,
    isAllBranches,
    loading: branchesLoading,
  } = useBranch();

  const defaultBranchId = useMemo(() => {
    if (!isAllBranches && selectedBranchId) return selectedBranchId;
    return branches[0]?._id || "";
  }, [branches, isAllBranches, selectedBranchId]);

  const [form, setForm] = useState({
    branch: "",
    expenseType: EXPENSE_TYPES[0],
    expenseDate: toInputDate(),
    amount: "",
    comment: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!editingId) {
      setForm((prev) => ({
        ...prev,
        branch: defaultBranchId,
      }));
    }
  }, [defaultBranchId, editingId]);

  const loadExpenses = useCallback(async () => {
    if (branchesLoading) return;

    if (!branches.length) {
      setItems([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await expenseApi.list({
        page,
        limit: 10,
        expenseType: filterType || undefined,
        branchId: selectedBranchId || ALL_BRANCHES,
      });
      setItems(result.items);
      setTotalPages(result.pagination.totalPages || 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load expenses"));
    } finally {
      setLoading(false);
    }
  }, [
    page,
    filterType,
    selectedBranchId,
    branches.length,
    branchesLoading,
  ]);

  useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const resetForm = () => {
    setForm({
      branch: defaultBranchId,
      expenseType: EXPENSE_TYPES[0],
      expenseDate: toInputDate(),
      amount: "",
      comment: "",
    });
    setEditingId(null);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.branch) {
      setError("Please select a branch");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      branch: form.branch,
      expenseType: form.expenseType,
      expenseDate: form.expenseDate,
      amount: Number(form.amount),
      comment: form.comment.trim(),
    };

    try {
      if (editingId) {
        await expenseApi.update(editingId, payload);
      } else {
        await expenseApi.create(payload);
      }
      resetForm();
      await loadExpenses();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save expense"));
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (expense) => {
    setEditingId(expense._id);
    setForm({
      branch: expense.branch?._id || expense.branch || "",
      expenseType: expense.expenseType,
      expenseDate: toInputDate(expense.expenseDate),
      amount: String(expense.amount),
      comment: expense.comment || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    setDeleteBusy(true);
    setError("");
    try {
      await expenseApi.remove(deleteTarget._id);
      setDeleteTarget(null);
      await loadExpenses();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete expense"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const scopeLabel = isAllBranches
    ? "All branches statistics"
    : selectedBranch?.name || "Selected branch";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
          Ledger · {scopeLabel}
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink sm:text-5xl">
          Expenses
        </h1>
        <p className="mt-2 text-sm text-ink/55">
          Record shop costs with branch, type, date, amount, and an optional note.
        </p>
      </div>

      {!branchesLoading && !branches.length ? (
        <div className="rounded-2xl border border-dashed border-slate-line bg-mist/80 p-6 text-sm text-ink/60">
          Create a branch before adding expenses.{" "}
          <Link to="/branches" className="font-semibold text-brass-deep underline">
            Go to Branches
          </Link>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="grid gap-4 rounded-2xl border border-slate-line/80 bg-mist/80 p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="text-xs font-medium text-ink/60">
            Branch
            <select
              required
              value={form.branch}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, branch: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
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

          <label className="text-xs font-medium text-ink/60">
            Expense type
            <select
              required
              value={form.expenseType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  expenseType: e.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
            >
              {EXPENSE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-ink/60">
            Expense date
            <input
              type="date"
              required
              value={form.expenseDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, expenseDate: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
            />
          </label>

          <label className="text-xs font-medium text-ink/60">
            Amount
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              placeholder="0.00"
            />
          </label>

          <label className="text-xs font-medium text-ink/60 sm:col-span-2">
            Comment
            <input
              type="text"
              maxLength={500}
              value={form.comment}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, comment: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
              placeholder="Optional note"
            />
          </label>

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={saving || !branches.length}
              className="rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brass-deep disabled:opacity-60"
            >
              {saving
                ? "Saving…"
                : editingId
                  ? "Update expense"
                  : "Add expense"}
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
      )}

      {error ? (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-xs font-medium text-ink/60">
          Filter by type
          <select
            value={filterType}
            onChange={(e) => {
              setPage(1);
              setFilterType(e.target.value);
            }}
            className="ml-2 rounded-xl border border-slate-line bg-mist px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            {EXPENSE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-ink/45">
          Page {page} of {totalPages}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-line/80 bg-mist/80">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-canvas/80 text-xs uppercase tracking-wide text-ink/45">
              <tr>
                <th className="px-5 py-3 font-medium">Branch</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Comment</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ink/45">
                    Loading expenses…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ink/45">
                    No expenses yet for this view.
                  </td>
                </tr>
              ) : (
                items.map((expense) => (
                  <tr key={expense._id} className="border-t border-slate-line/70">
                    <td className="px-5 py-3 text-ink/80">
                      {expense.branch?.name || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              CATEGORY_COLORS[expense.expenseType] || "#6b7280",
                          }}
                        />
                        {expense.expenseType}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink/70">
                      {formatDate(expense.expenseDate)}
                    </td>
                    <td className="px-5 py-3 font-medium">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="max-w-xs px-5 py-3 text-ink/60">
                      {expense.comment ? (
                        <span className="group relative inline-block max-w-full">
                          <span className="block max-w-xs truncate">
                            {expense.comment}
                          </span>
                          {expense.comment.length > 40 ? (
                            <span
                              role="tooltip"
                              className="pointer-events-none absolute bottom-[calc(100%+10px)] left-0 z-30 w-max max-w-sm scale-95 rounded-xl border border-brass/40 bg-white px-3.5 py-2.5 text-left text-xs leading-relaxed text-ink opacity-0 shadow-[0_12px_28px_-10px_rgba(59,91,219,0.35)] transition duration-150 group-hover:scale-100 group-hover:opacity-100"
                            >
                              <span className="absolute -bottom-1.5 left-4 h-3 w-3 rotate-45 border-b border-r border-brass/40 bg-white" />
                              <span className="relative block whitespace-normal break-words text-ink">
                                {expense.comment}
                              </span>
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(expense)}
                          className="rounded-lg border border-slate-line p-2 text-ink/60 transition hover:text-ink"
                          aria-label="Edit expense"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(expense)}
                          className="rounded-lg border border-slate-line p-2 text-danger/70 transition hover:text-danger"
                          aria-label="Delete expense"
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

      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-xl border border-slate-line px-3 py-2 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-xl border border-slate-line px-3 py-2 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this expense?"
        message={`${deleteTarget?.expenseType || "Expense"} · ${
          deleteTarget ? formatCurrency(deleteTarget.amount) : ""
        }. This will move it out of the live list.`}
        confirmLabel="Delete expense"
        cancelLabel="Keep"
        tone="danger"
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
