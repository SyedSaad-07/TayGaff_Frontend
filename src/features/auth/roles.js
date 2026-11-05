export const ROLES = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
};

/** Section keys — must match backend ModulePermissionEnum values. */
export const MODULES = {
  DASHBOARD: "dashboard",
  INVENTORY: "inventory",
  POS: "pos",
  SALES: "sales",
  SUPPLIERS: "suppliers",
  EXPENSES: "expenses",
  REPORTS: "reports",
  CUSTOMERS: "customers",
  BOOKINGS: "bookings",
  STITCHING: "stitching",
  GARMENTS: "garments",
  KARIGARS: "karigars",
};

export const MODULE_OPTIONS = [
  { key: MODULES.DASHBOARD, label: "Dashboard" },
  { key: MODULES.INVENTORY, label: "Inventory" },
  { key: MODULES.POS, label: "POS" },
  { key: MODULES.SALES, label: "Sales history" },
  { key: MODULES.SUPPLIERS, label: "Suppliers" },
  { key: MODULES.EXPENSES, label: "Expenses" },
  { key: MODULES.REPORTS, label: "Reports" },
  { key: MODULES.CUSTOMERS, label: "Customers" },
  { key: MODULES.BOOKINGS, label: "Booking" },
  { key: MODULES.STITCHING, label: "Stitching" },
  { key: MODULES.GARMENTS, label: "Garments" },
  { key: MODULES.KARIGARS, label: "Karigars" },
];

/** Default landing page after login / home redirect — overall business dashboard. */
export const DASHBOARD_PATH = "/dashboard";

const MODULE_HOME = {
  [MODULES.DASHBOARD]: "/dashboard",
  [MODULES.INVENTORY]: "/inventory",
  [MODULES.POS]: "/inventory/pos",
  [MODULES.SALES]: "/inventory/sales",
  [MODULES.SUPPLIERS]: "/inventory/suppliers",
  [MODULES.EXPENSES]: "/expenses",
  [MODULES.REPORTS]: "/reports",
  [MODULES.CUSTOMERS]: "/customers",
  [MODULES.BOOKINGS]: "/bookings",
  [MODULES.STITCHING]: "/stitching",
  [MODULES.GARMENTS]: "/garments",
  [MODULES.KARIGARS]: "/karigars",
};

export function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

export function isStaff(user) {
  return user?.role === ROLES.STAFF;
}

export function isStaffOrAdmin(user) {
  return isAdmin(user) || isStaff(user);
}

/**
 * Section access.
 * - Admin: all
 * - Staff with empty permissions: legacy full access
 * - Staff with permissions: only listed modules
 */
export function hasPermission(user, moduleKey) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!isStaff(user)) return false;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.length === 0) return true;
  return perms.includes(moduleKey);
}

export function hasAnyPermission(user, moduleKeys) {
  return moduleKeys.some((k) => hasPermission(user, k));
}

export function getPostLoginPath(user) {
  if (isAdmin(user)) return DASHBOARD_PATH;
  if (!isStaff(user)) return "/bookings";

  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.length === 0) return DASHBOARD_PATH;

  for (const opt of MODULE_OPTIONS) {
    if (perms.includes(opt.key) && MODULE_HOME[opt.key]) {
      return MODULE_HOME[opt.key];
    }
  }
  return "/bookings";
}
