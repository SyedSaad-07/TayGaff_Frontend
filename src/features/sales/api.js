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

export const salesApi = {
  stats(params = {}) {
    return api.get(`/sales/stats${toQuery(params)}`);
  },
  list(params = {}) {
    return api.get(`/sales${toQuery(params)}`);
  },
  getById(id) {
    return api.get(`/sales/${id}`);
  },
  getByReceiptToken(token) {
    return api.get(`/sales/receipt/${token}`);
  },
  checkout(payload) {
    return api.post("/sales/checkout", payload);
  },
  update(id, payload) {
    return api.patch(`/sales/${id}`, payload);
  },
  cancel(id, payload = {}) {
    return api.post(`/sales/${id}/cancel`, payload);
  },
  remove(id, payload = {}) {
    return api.delete(`/sales/${id}`, payload);
  },
  returnItems(id, payload) {
    return api.post(`/sales/${id}/returns`, payload);
  },
  addPayment(id, payload) {
    return api.post(`/sales/${id}/payments`, payload);
  },
};
