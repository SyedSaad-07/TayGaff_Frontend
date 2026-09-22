import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-atelier">
        <div className="text-center">
          <p className="font-display text-3xl text-ink">
            Tay<span className="italic text-brass">Gaff</span>
          </p>
          <p className="mt-2 text-sm text-muted">Preparing your atelier…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
