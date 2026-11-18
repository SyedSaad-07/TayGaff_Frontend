import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isAdmin } from "@/features/auth/roles";
import { useBranch } from "@/features/branches/BranchContext";

/**
 * Empty platforms must create a branch before any other shop operation.
 * Admins are sent to /branches; staff see a blocking message.
 */
export function RequireBranchGate({ children }) {
  const { user } = useAuth();
  const { branches, loading } = useBranch();
  const location = useLocation();
  const admin = isAdmin(user);
  const onBranchesPage =
    location.pathname === "/branches" ||
    location.pathname.startsWith("/branches/");

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted">Loading branches…</p>
      </div>
    );
  }

  if (branches.length > 0 || onBranchesPage) {
    return children;
  }

  if (admin) {
    return (
      <Navigate
        to="/branches"
        replace
        state={{ setupRequired: true, from: location.pathname }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-line/80 bg-white p-6 text-center">
      <p className="font-display text-2xl text-ink">No branch yet</p>
      <p className="mt-2 text-sm text-muted">
        This shop has no branches configured. Ask an admin to create a branch
        before bookings, POS, or other operations can continue.
      </p>
    </div>
  );
}
