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

export const bookingApi = {
  measureFields() {
    return api.get("/bookings/measure-fields");
  },
  garmentItems() {
    return api.get("/bookings/garment-items");
  },
  listGarmentItems(params = {}) {
    return api.get(`/bookings/garment-items${toQuery({ manage: true, ...params })}`);
  },
  getGarmentItem(id) {
    return api.get(`/bookings/garment-items/${id}`);
  },
  createGarmentItem(payload) {
    return api.post("/bookings/garment-items", payload);
  },
  updateGarmentItem(id, payload) {
    return api.patch(`/bookings/garment-items/${id}`, payload);
  },
  archiveGarmentItem(id) {
    return api.post(`/bookings/garment-items/${id}/archive`);
  },
  restoreGarmentItem(id) {
    return api.post(`/bookings/garment-items/${id}/restore`);
  },
  karigars() {
    return api.get("/bookings/karigars");
  },
  listKarigars(params = {}) {
    return api.get(`/bookings/karigars${toQuery({ manage: true, ...params })}`);
  },
  getKarigar(id) {
    return api.get(`/bookings/karigars/${id}`);
  },
  createKarigar(payload) {
    return api.post("/bookings/karigars", payload);
  },
  updateKarigar(id, payload) {
    return api.patch(`/bookings/karigars/${id}`, payload);
  },
  archiveKarigar(id) {
    return api.post(`/bookings/karigars/${id}/archive`);
  },
  restoreKarigar(id) {
    return api.post(`/bookings/karigars/${id}/restore`);
  },
  listKarigarRates(params = {}) {
    return api.get(`/bookings/karigar-rates${toQuery(params)}`);
  },
  createKarigarRate(payload) {
    return api.post("/bookings/karigar-rates", payload);
  },
  updateKarigarRate(id, payload) {
    return api.patch(`/bookings/karigar-rates/${id}`, payload);
  },
  deleteKarigarRate(id) {
    return api.delete(`/bookings/karigar-rates/${id}`);
  },
  listKarigarPayroll() {
    return api.get("/bookings/karigar-payroll");
  },
  getKarigarPayroll(id) {
    return api.get(`/bookings/karigars/${id}/payroll`);
  },
  listKarigarPayments(id, params = {}) {
    return api.get(`/bookings/karigars/${id}/payments${toQuery(params)}`);
  },
  createKarigarPayment(id, payload) {
    return api.post(`/bookings/karigars/${id}/payments`, payload);
  },
  deleteKarigarPayment(id, paymentId) {
    return api.delete(`/bookings/karigars/${id}/payments/${paymentId}`);
  },
  measurementProfiles(params = {}) {
    return api.get(`/bookings/measurement-profiles${toQuery(params)}`);
  },
  stitchingBoard(params = {}) {
    return api.get(`/bookings/stitching-board${toQuery(params)}`);
  },
  listCustomers(params = {}) {
    return api.get(`/bookings/customers${toQuery(params)}`);
  },
  getCustomer(id) {
    return api.get(`/bookings/customers/${id}`);
  },
  createCustomer(payload) {
    return api.post("/bookings/customers", payload);
  },
  updateCustomer(id, payload) {
    return api.patch(`/bookings/customers/${id}`, payload);
  },
  archiveCustomer(id) {
    return api.post(`/bookings/customers/${id}/archive`);
  },
  restoreCustomer(id) {
    return api.post(`/bookings/customers/${id}/restore`);
  },
  listCustomerTransactions(id, params = {}) {
    return api.get(`/bookings/customers/${id}/transactions${toQuery(params)}`);
  },
  getCustomerBalance(id) {
    return api.get(`/bookings/customers/${id}/balance`);
  },
  recordCustomerPayment(id, payload) {
    return api.post(`/bookings/customers/${id}/payments`, payload);
  },
  createCustomerTransaction(id, payload) {
    return api.post(`/bookings/customers/${id}/transactions`, payload);
  },
  deleteCustomerTransaction(txId) {
    return api.delete(`/bookings/customers/transactions/${txId}`);
  },
  list(params = {}) {
    return api.get(`/bookings${toQuery(params)}`);
  },
  getById(id) {
    return api.get(`/bookings/${id}`);
  },
  create(payload) {
    return api.post("/bookings", payload);
  },
  update(id, payload) {
    return api.patch(`/bookings/${id}`, payload);
  },
  remove(id) {
    return api.delete(`/bookings/${id}`);
  },
  updateLineStatus(id, lineId, payload) {
    return api.post(`/bookings/${id}/lines/${lineId}/status`, payload);
  },
  addPayment(id, payload) {
    return api.post(`/bookings/${id}/payments`, payload);
  },
  listStatuses() {
    return api.get("/bookings/statuses");
  },
  listStatusesInUse() {
    return api.get("/bookings/statuses/in-use");
  },
  createStatus(payload) {
    return api.post("/bookings/statuses", payload);
  },
  updateStatus(id, payload) {
    return api.patch(`/bookings/statuses/${id}`, payload);
  },
  deleteStatus(id) {
    return api.delete(`/bookings/statuses/${id}`);
  },
};
