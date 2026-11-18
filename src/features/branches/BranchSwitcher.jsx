import { Building2, ChevronDown } from "lucide-react";
import { useBranch } from "@/features/branches/BranchContext";
import { ALL_BRANCHES } from "@/features/branches/branchUtils";

export function BranchSwitcher() {
  const {
    branches,
    selectedBranchId,
    selectedBranch,
    isAllBranches,
    loading,
    canSelectAllBranches,
    setSelectedBranchId,
    selectAllBranches,
  } = useBranch();

  if (loading) {
    return (
      <div className="rounded-full border border-brass/30 bg-white px-3 py-2 text-xs text-muted">
        Loading branches…
      </div>
    );
  }

  if (!branches.length) {
    return (
      <div className="rounded-full border border-dashed border-brass/25 bg-white px-3 py-2 text-xs text-muted">
        No branches yet
      </div>
    );
  }

  // Staff: locked display of their home branch only
  if (!canSelectAllBranches) {
    return (
      <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-brass/35 bg-white px-3 py-2 text-xs font-medium text-ink sm:text-sm">
        <Building2 size={15} className="shrink-0 text-brass" />
        <span className="truncate">
          {selectedBranch?.name || "Assigned branch"}
          {selectedBranch?.code ? ` (${selectedBranch.code})` : ""}
        </span>
      </div>
    );
  }

  return (
    <label className="relative inline-flex w-full min-w-0 items-center">
      <Building2
        size={15}
        className="pointer-events-none absolute left-2.5 text-brass sm:left-3"
      />
      <select
        value={selectedBranchId || ""}
        onChange={(e) => {
          const value = e.target.value;
          if (value === ALL_BRANCHES) {
            selectAllBranches();
            return;
          }
          if (value) setSelectedBranchId(value);
        }}
        className="w-full min-w-0 appearance-none truncate rounded-full border border-brass/35 bg-white py-2 pl-8 pr-8 text-xs font-medium text-ink outline-none transition focus:border-brass sm:py-2.5 sm:pl-9 sm:pr-9 sm:text-sm"
        aria-label="Switch branch"
      >
        <option value={ALL_BRANCHES}>All branches statistics</option>
        {branches.map((branch) => (
          <option key={branch._id || branch.id} value={branch._id || branch.id}>
            {branch.name}
            {branch.code ? ` (${branch.code})` : ""}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 text-muted"
      />
      <span className="sr-only">
        {isAllBranches
          ? "All branches statistics"
          : selectedBranch?.name || "Select branch"}
      </span>
    </label>
  );
}
