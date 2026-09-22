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

  return (
    <label className="relative inline-flex min-w-[220px] items-center">
      <Building2 size={15} className="pointer-events-none absolute left-3 text-brass" />
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
        className="w-full appearance-none rounded-full border border-brass/35 bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-ink outline-none transition focus:border-brass"
        aria-label="Switch branch"
      >
        <option value={ALL_BRANCHES}>All branches statistics</option>
        {branches.map((branch) => (
          <option key={branch._id} value={branch._id}>
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
