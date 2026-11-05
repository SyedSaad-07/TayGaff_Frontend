import { api } from "@/shared/api/client";

function toQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const overviewApi = {
  dashboard(params = {}) {
    return api.get(`/overview/dashboard${toQuery(params)}`);
  },
  inventory(params = {}) {
    return api.get(`/overview/inventory${toQuery(params)}`);
  },
  bookings(params = {}) {
    return api.get(`/overview/bookings${toQuery(params)}`);
  },
};
