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

export const expenseApi = {
  create(payload) {
    return api.post("/expenses", payload);
  },

  list(params = {}) {
    return api.get(
      `/expenses${toQuery({
        page: params.page,
        limit: params.limit,
        expenseType: params.expenseType,
        period: params.period,
        startDate: params.startDate,
        endDate: params.endDate,
        branchId: params.branchId,
      })}`
    );
  },

  update(id, payload) {
    return api.patch(`/expenses/${id}`, payload);
  },

  remove(id) {
    return api.delete(`/expenses/${id}`);
  },

  stats(params) {
    return api.get(
      `/expenses/stats${toQuery({
        period: params.period,
        startDate: params.startDate,
        endDate: params.endDate,
        branchId: params.branchId,
        expenseType: params.expenseType,
      })}`
    );
  },
};
