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

export const supplierApi = {
  list(params = {}) {
    return api.get(`/suppliers${toQuery(params)}`);
  },
  getById(id) {
    return api.get(`/suppliers/${id}`);
  },
  create(payload) {
    return api.post("/suppliers", payload);
  },
  update(id, payload) {
    return api.patch(`/suppliers/${id}`, payload);
  },
  archive(id) {
    return api.post(`/suppliers/${id}/archive`);
  },
  recordPayment(id, payload) {
    return api.post(`/suppliers/${id}/payments`, payload);
  },
  listTransactions(id, params = {}) {
    return api.get(`/suppliers/${id}/transactions${toQuery(params)}`);
  },
  getBalance(id) {
    return api.get(`/suppliers/${id}/balance`);
  },
  /** Manual ledger row (opening balance or adjustment) — no inventory link. */
  createTransaction(id, payload) {
    return api.post(`/suppliers/${id}/transactions`, payload);
  },
};
