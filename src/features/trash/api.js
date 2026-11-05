import { api } from "@/shared/api/client";

function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const trashApi = {
  types() {
    return api.get("/trash/types");
  },
  counts() {
    return api.get("/trash/counts");
  },
  list(params) {
    return api.get(`/trash${toQuery(params)}`);
  },
  restore(type, id) {
    return api.post(`/trash/${type}/${id}/restore`);
  },
};
