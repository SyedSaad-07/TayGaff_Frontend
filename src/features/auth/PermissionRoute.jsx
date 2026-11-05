import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { getPostLoginPath, hasAnyPermission } from "@/features/auth/roles";

/**
 * Allows access when the user has any of the listed module permissions.
 */
export function PermissionRoute({ modules = [], children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasAnyPermission(user, modules)) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }
  return children;
}
