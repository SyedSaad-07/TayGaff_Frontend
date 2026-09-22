import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isAdmin } from "@/features/auth/roles";

export function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/bookings" replace />;

  return children;
}
