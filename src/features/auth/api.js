import { api, tokenStore } from "@/shared/api/client";

export const authApi = {
  async login(email, password) {
    const result = await api.post("/auth/login", { email, password });
    tokenStore.set(result.token);
    return result;
  },

  async me() {
    return api.get("/auth/me");
  },

  logout() {
    tokenStore.clear();
  },
};
