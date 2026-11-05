import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AdminRoute } from "@/features/auth/AdminRoute";
import { PermissionRoute } from "@/features/auth/PermissionRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { getPostLoginPath, MODULES, DASHBOARD_PATH } from "@/features/auth/roles";
import { BranchProvider } from "@/features/branches/BranchContext";
import { BranchesPage } from "@/features/branches/BranchesPage";
import { AppShell } from "@/shared/components/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { OverallDashboardPage } from "@/features/overview/OverallDashboardPage";
import { ReportsHubPage } from "@/features/reports/ReportsHubPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { AdminImportPage } from "@/features/adminImport/AdminImportPage";
import { WebsiteMediaPage } from "@/features/websiteMedia/WebsiteMediaPage";
import { ExpensesPage } from "@/features/expenses/ExpensesPage";
import { InventoryDashboardPage } from "@/features/inventory/InventoryDashboardPage";
import { InventoryDetailPage } from "@/features/inventory/InventoryDetailPage";
import { BookingsPage } from "@/features/bookings/BookingsPage";
import { BookingDetailPage } from "@/features/bookings/BookingDetailPage";
import { CustomersPage } from "@/features/bookings/CustomersPage";
import { CustomerDetailPage } from "@/features/bookings/CustomerDetailPage";
import { StitchingPage } from "@/features/bookings/StitchingPage";
import { GarmentItemsPage } from "@/features/bookings/GarmentItemsPage";
import { KarigarsPage } from "@/features/bookings/KarigarsPage";
import { KarigarPayrollPage } from "@/features/bookings/KarigarPayrollPage";
import { LegacyDataSchemaPage } from "@/features/docs/LegacyDataSchemaPage";
import { TrashPage } from "@/features/trash/TrashPage";
import { SuppliersPage } from "@/features/suppliers/SuppliersPage";
import { PosPage } from "@/features/sales/PosPage";
import { SalesHistoryPage } from "@/features/sales/SalesHistoryPage";
import { ReceiptPage } from "@/features/sales/ReceiptPage";
import { NotFoundPage } from "@/shared/components/NotFoundPage";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getPostLoginPath(user)} replace />;
}

function Permit({ modules, children }) {
  return <PermissionRoute modules={modules}>{children}</PermissionRoute>;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/receipt/:token" element={<ReceiptPage />} />
          <Route element={<ProtectedRoute />}>
            <Route index element={<HomeRedirect />} />

            <Route
              path="modules"
              element={<Navigate to={DASHBOARD_PATH} replace />}
            />

            <Route
              element={
                <BranchProvider>
                  <AppShell />
                </BranchProvider>
              }
            >
              <Route
                path="dashboard"
                element={
                  <Permit modules={[MODULES.DASHBOARD]}>
                    <OverallDashboardPage />
                  </Permit>
                }
              />
              <Route
                path="finance"
                element={
                  <Permit modules={[MODULES.EXPENSES, MODULES.DASHBOARD]}>
                    <DashboardPage />
                  </Permit>
                }
              />
              <Route
                path="expenses"
                element={
                  <Permit modules={[MODULES.EXPENSES]}>
                    <ExpensesPage />
                  </Permit>
                }
              />
              <Route
                path="reports"
                element={
                  <Permit modules={[MODULES.REPORTS]}>
                    <ReportsHubPage />
                  </Permit>
                }
              />
              <Route
                path="settings"
                element={
                  <AdminRoute>
                    <SettingsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="settings/import"
                element={
                  <AdminRoute>
                    <AdminImportPage />
                  </AdminRoute>
                }
              />
              <Route
                path="settings/website-media"
                element={
                  <AdminRoute>
                    <WebsiteMediaPage />
                  </AdminRoute>
                }
              />
              <Route
                path="trash"
                element={
                  <AdminRoute>
                    <TrashPage />
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
                  <Permit modules={[MODULES.INVENTORY]}>
                    <InventoryDashboardPage />
                  </Permit>
                }
              />
              <Route
                path="inventory/suppliers"
                element={
                  <Permit modules={[MODULES.SUPPLIERS]}>
                    <SuppliersPage />
                  </Permit>
                }
              />
              <Route
                path="inventory/pos"
                element={
                  <Permit modules={[MODULES.POS]}>
                    <PosPage />
                  </Permit>
                }
              />
              <Route
                path="inventory/sales"
                element={
                  <Permit modules={[MODULES.SALES]}>
                    <SalesHistoryPage />
                  </Permit>
                }
              />
              <Route
                path="inventory/:id"
                element={
                  <Permit modules={[MODULES.INVENTORY]}>
                    <InventoryDetailPage />
                  </Permit>
                }
              />

              <Route
                path="customers"
                element={
                  <Permit modules={[MODULES.CUSTOMERS]}>
                    <CustomersPage />
                  </Permit>
                }
              />
              <Route
                path="customers/:id"
                element={
                  <Permit modules={[MODULES.CUSTOMERS]}>
                    <CustomerDetailPage />
                  </Permit>
                }
              />
              <Route
                path="bookings/pos"
                element={
                  <Permit modules={[MODULES.POS]}>
                    <PosPage />
                  </Permit>
                }
              />
              <Route
                path="bookings/sales"
                element={
                  <Permit modules={[MODULES.SALES]}>
                    <SalesHistoryPage />
                  </Permit>
                }
              />
              <Route
                path="bookings"
                element={
                  <Permit modules={[MODULES.BOOKINGS]}>
                    <BookingsPage />
                  </Permit>
                }
              />
              <Route
                path="bookings/:id"
                element={
                  <Permit modules={[MODULES.BOOKINGS]}>
                    <BookingDetailPage />
                  </Permit>
                }
              />
              <Route
                path="stitching"
                element={
                  <Permit modules={[MODULES.STITCHING]}>
                    <StitchingPage />
                  </Permit>
                }
              />
              <Route
                path="garments"
                element={
                  <Permit modules={[MODULES.GARMENTS]}>
                    <GarmentItemsPage />
                  </Permit>
                }
              />
              <Route
                path="karigars"
                element={
                  <Permit modules={[MODULES.KARIGARS]}>
                    <KarigarsPage />
                  </Permit>
                }
              />
              <Route
                path="karigar-payroll"
                element={
                  <Permit modules={[MODULES.KARIGARS]}>
                    <KarigarPayrollPage />
                  </Permit>
                }
              />

              <Route
                path="suppliers"
                element={<Navigate to="/inventory/suppliers" replace />}
              />
              <Route path="pos" element={<Navigate to="/inventory/pos" replace />} />
              <Route
                path="sales"
                element={<Navigate to="/inventory/sales" replace />}
              />

              <Route
                path="docs/legacy-schema"
                element={
                  <AdminRoute>
                    <LegacyDataSchemaPage />
                  </AdminRoute>
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
