export const ALL_BRANCHES = "all";

const STORAGE_KEY = "taygaff_selected_branch";
const PREFERRED_KEY = "taygaff_preferred_branch";

export function getStoredBranchId() {
  return localStorage.getItem(STORAGE_KEY);
}

export function storeBranchId(branchId) {
  if (!branchId) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, branchId);
}

export function getPreferredBranchId() {
  return localStorage.getItem(PREFERRED_KEY);
}

export function storePreferredBranchId(branchId) {
  if (!branchId || branchId === ALL_BRANCHES) {
    localStorage.removeItem(PREFERRED_KEY);
    return;
  }
  localStorage.setItem(PREFERRED_KEY, branchId);
}

/** Resolve a concrete branch id (never "all"). Falls back to first in list. */
export function resolveConcreteBranchId(branches, preferredId) {
  if (!branches.length) return null;

  if (preferredId && preferredId !== ALL_BRANCHES) {
    const match = branches.find((branch) => branch._id === preferredId);
    if (match) return match._id;
  }

  return branches[0]._id;
}

export function resolveDefaultBranchId(branches, preferredId) {
  if (!branches.length) return null;

  if (preferredId === ALL_BRANCHES) {
    return ALL_BRANCHES;
  }

  return resolveConcreteBranchId(branches, preferredId);
}
