import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AdminRoute } from "@/features/auth/AdminRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { getPostLoginPath } from "@/features/auth/roles";
import { BranchProvider } from "@/features/branches/BranchContext";
import { BranchesPage } from "@/features/branches/BranchesPage";
import { AppShell } from "@/shared/components/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ExpensesPage } from "@/features/expenses/ExpensesPage";
import { InventoryDashboardPage } from "@/features/inventory/InventoryDashboardPage";
import { InventoryDetailPage } from "@/features/inventory/InventoryDetailPage";
import { AdminModulesPage } from "@/features/modules/AdminModulesPage";
import { BookingsPage } from "@/features/bookings/BookingsPage";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getPostLoginPath(user)} replace />;
}

function CatchAllRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getPostLoginPath(user)} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route index element={<HomeRedirect />} />

            {/* Module picker — no sidebar */}
            <Route
              path="modules"
              element={
                <AdminRoute>
                  <AdminModulesPage />
                </AdminRoute>
              }
            />

            {/* Module workspaces — with sidebar */}
            <Route
              element={
                <BranchProvider>
                  <AppShell />
                </BranchProvider>
              }
            >
              <Route
                path="finance"
                element={
                  <AdminRoute>
                    <DashboardPage />
                  </AdminRoute>
                }
              />
              <Route
                path="expenses"
                element={
                  <AdminRoute>
                    <ExpensesPage />
                  </AdminRoute>
                }
              />
              <Route
                path="branches"
                element={
                  <AdminRoute>
                    <BranchesPage />
                  </AdminRoute>
                }
              />
              <Route
                path="inventory"
                element={
                  <AdminRoute>
                    <InventoryDashboardPage />
                  </AdminRoute>
                }
              />
              <Route
                path="inventory/:id"
                element={
                  <AdminRoute>
                    <InventoryDetailPage />
                  </AdminRoute>
                }
              />
              <Route path="bookings" element={<BookingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
