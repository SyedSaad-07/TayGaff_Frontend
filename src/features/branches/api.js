import { api } from "@/shared/api/client";

export const branchApi = {
  list() {
    return api.get("/branches");
  },

  create(payload) {
    return api.post("/branches", payload);
  },

  update(id, payload) {
    return api.patch(`/branches/${id}`, payload);
  },

  remove(id) {
    return api.delete(`/branches/${id}`);
  },
};
