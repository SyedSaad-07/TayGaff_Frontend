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

export const inventoryApi = {
  stats(params = {}) {
    return api.get(`/inventories/stats${toQuery(params)}`);
  },

  list(params = {}) {
    return api.get(`/inventories${toQuery(params)}`);
  },

  getById(id) {
    return api.get(`/inventories/${id}`);
  },

  create(payload) {
    return api.post("/inventories", payload);
  },

  update(id, payload) {
    return api.patch(`/inventories/${id}`, payload);
  },

  archive(id) {
    return api.post(`/inventories/${id}/archive`);
  },

  createSale(id, payload) {
    return api.post(`/inventories/${id}/sales`, payload);
  },

  recordPayment(id, payload) {
    return api.post(`/inventories/${id}/payments`, payload);
  },

  history(id) {
    return api.get(`/inventories/${id}/history`);
  },

  sources(params = {}) {
    return api.get(`/inventories/sources${toQuery(params)}`);
  },
};
