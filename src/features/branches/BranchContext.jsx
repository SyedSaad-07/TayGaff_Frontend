import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { branchApi } from "@/features/branches/api";
import {
  ALL_BRANCHES,
  getPreferredBranchId,
  getStoredBranchId,
  resolveConcreteBranchId,
  resolveDefaultBranchId,
  storeBranchId,
  storePreferredBranchId,
} from "@/features/branches/branchUtils";
import { ApiError } from "@/shared/api/client";

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState(
    () => getStoredBranchId()
  );
  const [preferredBranchId, setPreferredBranchIdState] = useState(
    () => getPreferredBranchId() || getStoredBranchId()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshBranches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await branchApi.list();
      setBranches(list);
      return list;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load branches");
      setBranches([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBranches();
  }, [refreshBranches]);

  // Keep selection + preferred branch valid when the branch list changes (create/delete)
  useEffect(() => {
    if (loading) return;

    const nextPreferred = resolveConcreteBranchId(branches, preferredBranchId);
    if (nextPreferred !== preferredBranchId) {
      setPreferredBranchIdState(nextPreferred);
      storePreferredBranchId(nextPreferred);
    }

    if (selectedBranchId === ALL_BRANCHES) {
      storeBranchId(ALL_BRANCHES);
      return;
    }

    const nextSelected = resolveDefaultBranchId(branches, selectedBranchId);
    if (nextSelected !== selectedBranchId) {
      setSelectedBranchIdState(nextSelected);
    }
    storeBranchId(nextSelected);
  }, [branches, loading, preferredBranchId, selectedBranchId]);

  const setSelectedBranchId = useCallback((branchId) => {
    setSelectedBranchIdState(branchId);
    storeBranchId(branchId);

    if (branchId && branchId !== ALL_BRANCHES) {
      setPreferredBranchIdState(branchId);
      storePreferredBranchId(branchId);
    }
  }, []);

  const selectAllBranches = useCallback(() => {
    setSelectedBranchIdState(ALL_BRANCHES);
    storeBranchId(ALL_BRANCHES);
  }, []);

  const restoreDefaultBranch = useCallback(() => {
    const nextId = resolveConcreteBranchId(branches, preferredBranchId);
    setSelectedBranchIdState(nextId);
    storeBranchId(nextId);
    if (nextId) {
      setPreferredBranchIdState(nextId);
      storePreferredBranchId(nextId);
    }
  }, [branches, preferredBranchId]);

  const selectedBranch = useMemo(() => {
    if (!selectedBranchId || selectedBranchId === ALL_BRANCHES) return null;
    return branches.find((branch) => branch._id === selectedBranchId) || null;
  }, [branches, selectedBranchId]);

  const isAllBranches = selectedBranchId === ALL_BRANCHES;

  const value = useMemo(
    () => ({
      branches,
      selectedBranchId,
      preferredBranchId,
      selectedBranch,
      isAllBranches,
      loading,
      error,
      setSelectedBranchId,
      selectAllBranches,
      restoreDefaultBranch,
      refreshBranches,
    }),
    [
      branches,
      selectedBranchId,
      preferredBranchId,
      selectedBranch,
      isAllBranches,
      loading,
      error,
      setSelectedBranchId,
      selectAllBranches,
      restoreDefaultBranch,
      refreshBranches,
    ]
  );

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error("useBranch must be used within BranchProvider");
  }
  return ctx;
}
