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
import { useAuth } from "@/features/auth/AuthContext";
import { isAdmin } from "@/features/auth/roles";
import { getErrorMessage } from "@/shared/api/client";

const BranchContext = createContext(null);

function staffHomeBranchId(user) {
  return user?.branchId || user?.branch?.id || user?.branch?._id || "";
}

export function BranchProvider({ children }) {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const homeBranchId = staffHomeBranchId(user);

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
      setError(getErrorMessage(err, "Failed to load branches"));
      setBranches([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBranches();
  }, [refreshBranches]);

  // Staff: always lock to home branch. Admin: keep selection valid.
  useEffect(() => {
    if (loading) return;

    if (!admin && homeBranchId) {
      if (selectedBranchId !== homeBranchId) {
        setSelectedBranchIdState(homeBranchId);
        storeBranchId(homeBranchId);
      }
      if (preferredBranchId !== homeBranchId) {
        setPreferredBranchIdState(homeBranchId);
        storePreferredBranchId(homeBranchId);
      }
      return;
    }

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
  }, [
    admin,
    branches,
    homeBranchId,
    loading,
    preferredBranchId,
    selectedBranchId,
  ]);

  const setSelectedBranchId = useCallback(
    (branchId) => {
      if (!admin && homeBranchId) {
        setSelectedBranchIdState(homeBranchId);
        storeBranchId(homeBranchId);
        storePreferredBranchId(homeBranchId);
        return;
      }
      setSelectedBranchIdState(branchId);
      storeBranchId(branchId);
      if (branchId && branchId !== ALL_BRANCHES) {
        setPreferredBranchIdState(branchId);
        storePreferredBranchId(branchId);
      }
    },
    [admin, homeBranchId]
  );

  const selectAllBranches = useCallback(() => {
    if (!admin) return;
    setSelectedBranchIdState(ALL_BRANCHES);
    storeBranchId(ALL_BRANCHES);
  }, [admin]);

  const restoreDefaultBranch = useCallback(() => {
    if (!admin && homeBranchId) {
      setSelectedBranchIdState(homeBranchId);
      storeBranchId(homeBranchId);
      return;
    }
    const nextId = resolveConcreteBranchId(branches, preferredBranchId);
    setSelectedBranchIdState(nextId);
    storeBranchId(nextId);
    if (nextId) {
      setPreferredBranchIdState(nextId);
      storePreferredBranchId(nextId);
    }
  }, [admin, branches, homeBranchId, preferredBranchId]);

  const selectedBranch = useMemo(() => {
    if (!selectedBranchId || selectedBranchId === ALL_BRANCHES) return null;
    return (
      branches.find(
        (branch) =>
          branch._id === selectedBranchId || branch.id === selectedBranchId
      ) || null
    );
  }, [branches, selectedBranchId]);

  const isAllBranches = admin && selectedBranchId === ALL_BRANCHES;

  /** Query value for branch-scoped APIs (staff never sends "all"). */
  const queryBranchId = isAllBranches
    ? ALL_BRANCHES
    : selectedBranchId || homeBranchId || "";

  /**
   * Concrete branch for creates. When admin is on All, returns "" so forms
   * must show a required branch picker.
   */
  const createBranchId = useMemo(() => {
    if (!admin && homeBranchId) return homeBranchId;
    if (isAllBranches) return "";
    if (selectedBranchId && selectedBranchId !== ALL_BRANCHES) {
      return selectedBranchId;
    }
    return preferredBranchId && preferredBranchId !== ALL_BRANCHES
      ? preferredBranchId
      : "";
  }, [admin, homeBranchId, isAllBranches, preferredBranchId, selectedBranchId]);

  const needsCreateBranchPicker = admin && isAllBranches;

  const value = useMemo(
    () => ({
      branches,
      selectedBranchId,
      preferredBranchId,
      selectedBranch,
      isAllBranches,
      queryBranchId,
      createBranchId,
      needsCreateBranchPicker,
      canSelectAllBranches: admin,
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
      queryBranchId,
      createBranchId,
      needsCreateBranchPicker,
      admin,
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
