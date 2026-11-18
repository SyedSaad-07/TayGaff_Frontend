import { api } from "@/shared/api/client";

export const adminImportApi = {
  policy() {
    return api.get("/admin/import/policy");
  },

  getJob(id) {
    return api.get(`/admin/import/jobs/${id}`);
  },

  uploadPack(file) {
    const form = new FormData();
    form.append("pack", file);
    return api.postForm("/admin/import/jobs", form);
  },

  dryRun(id, { branchId } = {}) {
    return api.post(`/admin/import/jobs/${id}/dry-run`, { branchId });
  },

  apply(id, { branchId } = {}) {
    return api.post(`/admin/import/jobs/${id}/apply`, { branchId });
  },
};
