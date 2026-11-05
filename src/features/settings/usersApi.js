import { api } from "@/shared/api/client";

export const usersApi = {
  list() {
    return api.get("/auth/users");
  },
  create(payload) {
    return api.post("/auth/users", payload);
  },
  update(id, payload) {
    return api.patch(`/auth/users/${id}`, payload);
  },
};
