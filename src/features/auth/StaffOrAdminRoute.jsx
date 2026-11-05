import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isStaffOrAdmin } from "@/features/auth/roles";

export function StaffOrAdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  // Authenticated but outside staff/admin — land on bookings (open to all users).
  // Avoid redirecting to /finance here: that route is also staff/admin-gated.
  if (!isStaffOrAdmin(user)) return <Navigate to="/bookings" replace />;

  return children;
}
