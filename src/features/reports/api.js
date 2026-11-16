import { api } from "@/shared/api/client";

function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    q.set(key, String(value));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const reportsApi = {
  getBalanceSheet(params = {}) {
    return api.get(`/reports/balance-sheet${toQuery(params)}`);
  },
  listAccounts() {
    return api.get("/reports/accounts");
  },
  ensureAccounts() {
    return api.post("/reports/accounts/ensure");
  },
  getAccountLines(accountId, params = {}) {
    return api.get(
      `/reports/accounts/${accountId}/lines${toQuery(params)}`
    );
  },
};
