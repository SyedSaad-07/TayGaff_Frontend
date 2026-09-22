export const ROLES = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
};

export function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

export function getPostLoginPath(user) {
  return isAdmin(user) ? "/modules" : "/bookings";
}
