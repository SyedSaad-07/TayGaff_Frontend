import { api } from "@/shared/api/client";

export const websiteMediaApi = {
  catalog() {
    return api.get("/admin/website-media/catalog");
  },

  list(section) {
    const q = section ? `?section=${encodeURIComponent(section)}` : "";
    return api.get(`/admin/website-media${q}`);
  },

  upload({ section, slotKey, label, file }) {
    const form = new FormData();
    form.append("image", file);
    form.append("section", section);
    if (slotKey) form.append("slotKey", slotKey);
    if (label) form.append("label", label);
    return api.postForm("/admin/website-media", form);
  },

  update(id, payload) {
    return api.patch(`/admin/website-media/${id}`, payload);
  },

  remove(id) {
    return api.delete(`/admin/website-media/${id}`);
  },
};

export const websiteServicesApi = {
  list() {
    return api.get("/admin/website-services?all=1");
  },

  create(payload) {
    return api.post("/admin/website-services", {
      title: String(payload?.title || "").trim(),
      description: String(payload?.description || "").trim(),
      icon: String(payload?.icon || "◈").trim() || "◈",
    });
  },

  update(id, payload) {
    return api.patch(`/admin/website-services/${id}`, {
      title: String(payload?.title || "").trim(),
      description: String(payload?.description || "").trim(),
      icon: String(payload?.icon || "◈").trim() || "◈",
    });
  },

  remove(id) {
    return api.delete(`/admin/website-services/${id}`);
  },
};

export const websiteProductsApi = {
  list() {
    return api.get("/admin/website-products?all=1");
  },

  create({ title, description, tag, file }) {
    if (file) {
      const form = new FormData();
      form.append("title", String(title || "").trim());
      form.append("description", String(description || "").trim());
      form.append("tag", String(tag || "").trim());
      form.append("image", file);
      return api.postForm("/admin/website-products", form);
    }
    return api.post("/admin/website-products", {
      title: String(title || "").trim(),
      description: String(description || "").trim(),
      tag: String(tag || "").trim(),
    });
  },

  update(id, { title, description, tag, file }) {
    if (file) {
      const form = new FormData();
      form.append("title", String(title || "").trim());
      form.append("description", String(description || "").trim());
      form.append("tag", String(tag || "").trim());
      form.append("image", file);
      return api.patchForm(`/admin/website-products/${id}`, form);
    }
    return api.patch(`/admin/website-products/${id}`, {
      title: String(title || "").trim(),
      description: String(description || "").trim(),
      tag: String(tag || "").trim(),
    });
  },

  removeImage(id) {
    return api.delete(`/admin/website-products/${id}/image`);
  },

  remove(id) {
    return api.delete(`/admin/website-products/${id}`);
  },
};

export const websiteGalleryApi = {
  list() {
    return api.get("/admin/website-gallery?all=1");
  },

  create({ title, description, file }) {
    const form = new FormData();
    form.append("title", String(title || "").trim());
    form.append("description", String(description || "").trim());
    form.append("image", file);
    return api.postForm("/admin/website-gallery", form);
  },

  update(id, { title, description, file }) {
    if (file) {
      const form = new FormData();
      form.append("title", String(title || "").trim());
      form.append("description", String(description || "").trim());
      form.append("image", file);
      return api.patchForm(`/admin/website-gallery/${id}`, form);
    }
    return api.patch(`/admin/website-gallery/${id}`, {
      title: String(title || "").trim(),
      description: String(description || "").trim(),
    });
  },

  remove(id) {
    return api.delete(`/admin/website-gallery/${id}`);
  },
};
