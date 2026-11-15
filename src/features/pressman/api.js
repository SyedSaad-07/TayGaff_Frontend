import { api } from "@/shared/api/client";

function toQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const pressmanApi = {
  list(params = {}) {
    return api.get(`/pressmen${toQuery(params)}`);
  },
  get(id) {
    return api.get(`/pressmen/${id}`);
  },
  create(payload) {
    return api.post("/pressmen", payload);
  },
  update(id, payload) {
    return api.patch(`/pressmen/${id}`, payload);
  },
  remove(id) {
    return api.delete(`/pressmen/${id}`);
  },
  listEntries(id, params = {}) {
    return api.get(`/pressmen/${id}/entries${toQuery(params)}`);
  },
  createEntry(id, payload) {
    return api.post(`/pressmen/${id}/entries`, payload);
  },
  updateEntry(id, entryId, payload) {
    return api.patch(`/pressmen/${id}/entries/${entryId}`, payload);
  },
  deleteEntry(id, entryId) {
    return api.delete(`/pressmen/${id}/entries/${entryId}`);
  },
};

export const accessoriesApi = {
  list(params = {}) {
    return api.get(`/accessories${toQuery(params)}`);
  },
  get(id) {
    return api.get(`/accessories/${id}`);
  },
  create(payload) {
    return api.post("/accessories", payload);
  },
  update(id, payload) {
    return api.patch(`/accessories/${id}`, payload);
  },
  remove(id) {
    return api.delete(`/accessories/${id}`);
  },
  listEntries(id, params = {}) {
    return api.get(`/accessories/${id}/entries${toQuery(params)}`);
  },
  createEntry(id, payload) {
    return api.post(`/accessories/${id}/entries`, payload);
  },
  updateEntry(id, entryId, payload) {
    return api.patch(`/accessories/${id}/entries/${entryId}`, payload);
  },
  deleteEntry(id, entryId) {
    return api.delete(`/accessories/${id}/entries/${entryId}`);
  },
};
