import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
  Images,
  Plus,
  Pencil,
  Save,
  X,
} from "lucide-react";
import {
  websiteMediaApi,
  websiteServicesApi,
  websiteProductsApi,
  websiteGalleryApi,
} from "@/features/websiteMedia/api";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { getErrorMessage } from "@/shared/api/client";

function SlotCard({ title, description, previewUrl, busy, onUpload, onDelete }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-line/80 bg-white">
      <div className="relative aspect-[4/3] bg-mist/60">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
            <ImagePlus size={28} className="opacity-50" />
            <span className="text-xs">No image yet</span>
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="font-medium text-ink">{title}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-muted">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brass px-3 py-2 text-sm font-medium text-white hover:bg-brass-deep">
            {busy === "upload" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            {previewUrl ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={Boolean(busy)}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onUpload(file);
              }}
            />
          </label>
          {previewUrl ? (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              {busy === "delete" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const EMPTY_SERVICE = { title: "", description: "", icon: "◈" };
const EMPTY_PRODUCT = { title: "", description: "", tag: "" };
const EMPTY_GALLERY = { title: "", description: "" };

export function WebsiteMediaPage() {
  const [aboutItems, setAboutItems] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState(() => ({ ...EMPTY_SERVICE }));
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(() => ({ ...EMPTY_PRODUCT }));
  const [productFile, setProductFile] = useState(null);
  const [editingGallery, setEditingGallery] = useState(null);
  const [galleryForm, setGalleryForm] = useState(() => ({ ...EMPTY_GALLERY }));
  const [galleryFile, setGalleryFile] = useState(null);
  const [formBusy, setFormBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [media, svc, prod, gal] = await Promise.all([
      websiteMediaApi.list(),
      websiteServicesApi.list(),
      websiteProductsApi.list(),
      websiteGalleryApi.list(),
    ]);
    setAboutItems((media.items || []).filter((i) => i.section === "about"));
    setServices(Array.isArray(svc) ? svc : []);
    setProducts(Array.isArray(prod) ? prod : []);
    setGallery(Array.isArray(gal) ? gal : []);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        await refresh();
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load website content"));
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const aboutMain = aboutItems.find((i) => i.slotKey === "main");

  const uploadAbout = async (file) => {
    setBusyKey("about:upload");
    setError("");
    try {
      await websiteMediaApi.upload({
        section: "about",
        slotKey: "main",
        label: "About photo",
        file,
      });
      setNotice("About image saved. Refresh the website to see it.");
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed"));
    } finally {
      setBusyKey("");
    }
  };

  const deleteAbout = async () => {
    if (!aboutMain) return;
    setBusyKey("about:delete");
    setError("");
    try {
      await websiteMediaApi.remove(aboutMain.id || aboutMain._id);
      setConfirmDelete(null);
      setNotice("About image deleted.");
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Delete failed"));
    } finally {
      setBusyKey("");
    }
  };

  const saveService = async () => {
    const payload = {
      title: String(serviceForm.title || "").trim(),
      description: String(serviceForm.description || "").trim(),
      icon: String(serviceForm.icon || "◈").trim() || "◈",
    };
    if (!payload.title) {
      setError("Service title is required");
      return;
    }
    setFormBusy(true);
    setError("");
    try {
      if (editingService === "new") {
        await websiteServicesApi.create(payload);
        setNotice(`Service “${payload.title}” saved.`);
      } else {
        await websiteServicesApi.update(editingService, payload);
        setNotice("Service updated.");
      }
      setEditingService(null);
      setServiceForm({ ...EMPTY_SERVICE });
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save service"));
    } finally {
      setFormBusy(false);
    }
  };

  const saveProduct = async () => {
    const payload = {
      title: String(productForm.title || "").trim(),
      description: String(productForm.description || "").trim(),
      tag: String(productForm.tag || "").trim(),
      file: productFile || undefined,
    };
    if (!payload.title) {
      setError("Product title is required");
      return;
    }
    setFormBusy(true);
    setError("");
    try {
      if (editingProduct === "new") {
        await websiteProductsApi.create(payload);
        setNotice(`Product “${payload.title}” saved.`);
      } else {
        await websiteProductsApi.update(editingProduct, payload);
        setNotice("Product updated.");
      }
      setEditingProduct(null);
      setProductForm({ ...EMPTY_PRODUCT });
      setProductFile(null);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save product"));
    } finally {
      setFormBusy(false);
    }
  };

  const saveGallery = async () => {
    const payload = {
      title: String(galleryForm.title || "").trim(),
      description: String(galleryForm.description || "").trim(),
      file: galleryFile || undefined,
    };
    if (editingGallery === "new" && !payload.file) {
      setError("Choose an image for the gallery item");
      return;
    }
    setFormBusy(true);
    setError("");
    try {
      if (editingGallery === "new") {
        await websiteGalleryApi.create(payload);
        setNotice(
          `Gallery item “${payload.title || "photo"}” saved.`
        );
      } else {
        await websiteGalleryApi.update(editingGallery, payload);
        setNotice("Gallery item updated.");
      }
      setEditingGallery(null);
      setGalleryForm({ ...EMPTY_GALLERY });
      setGalleryFile(null);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save gallery item"));
    } finally {
      setFormBusy(false);
    }
  };

  const runConfirmDelete = async () => {
    if (!confirmDelete) return;
    setFormBusy(true);
    setError("");
    try {
      const { type, item } = confirmDelete;
      const id = item.id || item._id;
      if (type === "about") await deleteAbout();
      else if (type === "service") await websiteServicesApi.remove(id);
      else if (type === "product") await websiteProductsApi.remove(id);
      else if (type === "product-image")
        await websiteProductsApi.removeImage(id);
      else if (type === "gallery") await websiteGalleryApi.remove(id);
      setConfirmDelete(null);
      setNotice("Deleted.");
      if (type !== "about") await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Delete failed"));
    } finally {
      setFormBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            <ArrowLeft size={16} />
            Settings
          </Link>
          <h1 className="mt-2 font-display text-4xl text-ink">Website content</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Manage services, unstitched clothing, gallery, and the about image.
            Changes show on the public site after refresh.
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brass/10 text-brass">
          <Images size={22} />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={18} className="animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          {/* Services */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-ink">
                  Tailoring Services
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Title and description for each service card.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingService("new");
                  setServiceForm({ ...EMPTY_SERVICE });
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-medium text-white"
              >
                <Plus size={16} />
                Add service
              </button>
            </div>

            {editingService ? (
              <form
                className="space-y-3 rounded-2xl border border-slate-line/80 bg-white p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveService();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-[80px_1fr]">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Icon
                    </label>
                    <input
                      value={serviceForm.icon}
                      onChange={(e) =>
                        setServiceForm((f) => ({ ...f, icon: e.target.value }))
                      }
                      maxLength={8}
                      className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2 text-center text-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Title
                    </label>
                    <input
                      required
                      value={serviceForm.title}
                      onChange={(e) =>
                        setServiceForm((f) => ({ ...f, title: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <textarea
                  value={serviceForm.description}
                  onChange={(e) =>
                    setServiceForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Description"
                  className="w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={formBusy}
                    className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2 text-sm font-medium text-white"
                  >
                    {formBusy ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingService(null)}
                    className="rounded-xl border border-slate-line px-4 py-2 text-sm"
                  >
                    <X size={16} className="inline" /> Cancel
                  </button>
                </div>
              </form>
            ) : null}

            <div className="space-y-3">
              {services.map((svc) => (
                <div
                  key={svc.id || svc._id}
                  className="flex flex-wrap items-start gap-4 rounded-2xl border border-slate-line/80 bg-white p-4"
                >
                  <span className="text-2xl text-brass">{svc.icon || "◈"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{svc.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {svc.description || "—"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingService(svc.id || svc._id);
                        setServiceForm({
                          title: svc.title || "",
                          description: svc.description || "",
                          icon: svc.icon || "◈",
                        });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-line px-3 py-2 text-sm"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDelete({ type: "service", item: svc })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Products */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-ink">
                  Unstitched Clothing
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Add products with title, description, optional tag and image.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct("new");
                  setProductForm({ ...EMPTY_PRODUCT });
                  setProductFile(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-medium text-white"
              >
                <Plus size={16} />
                Add product
              </button>
            </div>

            {editingProduct ? (
              <form
                className="space-y-3 rounded-2xl border border-slate-line/80 bg-white p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveProduct();
                }}
              >
                <input
                  required
                  value={productForm.title}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Title"
                  className="w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                />
                <textarea
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Description"
                  className="w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                />
                <input
                  value={productForm.tag}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, tag: e.target.value }))
                  }
                  placeholder="Tag (e.g. Popular, New) — optional"
                  className="w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-line px-3 py-2 text-sm">
                  <Upload size={16} />
                  {productFile
                    ? productFile.name
                    : editingProduct === "new"
                      ? "Choose image (optional)"
                      : "Replace image (optional)"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      setProductFile(e.target.files?.[0] || null);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={formBusy}
                    className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2 text-sm font-medium text-white"
                  >
                    {formBusy ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(null);
                      setProductFile(null);
                    }}
                    className="rounded-xl border border-slate-line px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              {products.map((p) => (
                <div
                  key={p.id || p._id}
                  className="overflow-hidden rounded-2xl border border-slate-line/80 bg-white"
                >
                  <div className="relative aspect-square bg-mist/60">
                    {p.url ? (
                      <img
                        src={p.url}
                        alt={p.title}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="font-medium text-ink">
                      {p.title}
                      {p.tag ? (
                        <span className="ml-2 text-xs text-brass">{p.tag}</span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted">{p.description || "—"}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(p.id || p._id);
                          setProductForm({
                            title: p.title || "",
                            description: p.description || "",
                            tag: p.tag || "",
                          });
                          setProductFile(null);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-line px-3 py-2 text-sm"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      {p.url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDelete({ type: "product-image", item: p })
                          }
                          className="rounded-xl border border-slate-line px-3 py-2 text-sm"
                        >
                          Remove image
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({ type: "product", item: p })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Gallery */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-ink">
                  Craftsmanship Gallery
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Add photos with a caption (title) and optional description.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingGallery("new");
                  setGalleryForm({ ...EMPTY_GALLERY });
                  setGalleryFile(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-medium text-white"
              >
                <Plus size={16} />
                Add gallery photo
              </button>
            </div>

            {editingGallery ? (
              <form
                className="space-y-3 rounded-2xl border border-slate-line/80 bg-white p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveGallery();
                }}
              >
                <input
                  value={galleryForm.title}
                  onChange={(e) =>
                    setGalleryForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Caption / title"
                  className="w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                />
                <textarea
                  value={galleryForm.description}
                  onChange={(e) =>
                    setGalleryForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Description (optional)"
                  className="w-full rounded-xl border border-slate-line px-3 py-2 text-sm"
                />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-line px-3 py-2 text-sm">
                  <Upload size={16} />
                  {galleryFile
                    ? galleryFile.name
                    : editingGallery === "new"
                      ? "Choose image (required)"
                      : "Replace image (optional)"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      setGalleryFile(e.target.files?.[0] || null);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={formBusy}
                    className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2 text-sm font-medium text-white"
                  >
                    {formBusy ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGallery(null);
                      setGalleryFile(null);
                    }}
                    className="rounded-xl border border-slate-line px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            {gallery.length === 0 ? (
              <p className="text-sm text-muted">
                No gallery photos yet. The website keeps default images until
                you add some here.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gallery.map((item) => (
                  <div
                    key={item.id || item._id}
                    className="overflow-hidden rounded-2xl border border-slate-line/80 bg-white"
                  >
                    <div className="relative aspect-[3/4] bg-mist/60">
                      <img
                        src={item.url}
                        alt={item.title || "Gallery"}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-2 p-4">
                      <p className="font-medium text-ink">
                        {item.title || "Untitled"}
                      </p>
                      {item.description ? (
                        <p className="text-sm text-muted">{item.description}</p>
                      ) : null}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGallery(item.id || item._id);
                            setGalleryForm({
                              title: item.title || "",
                              description: item.description || "",
                            });
                            setGalleryFile(null);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-line px-3 py-2 text-sm"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDelete({ type: "gallery", item })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* About image only */}
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-2xl text-ink">About us</h2>
              <p className="mt-1 text-sm text-muted">
                Side image next to Our Story.
              </p>
            </div>
            <div className="max-w-sm">
              <SlotCard
                title="About photo"
                description="about · main"
                previewUrl={aboutMain?.url}
                busy={
                  busyKey === "about:upload"
                    ? "upload"
                    : busyKey === "about:delete"
                      ? "delete"
                      : ""
                }
                onUpload={uploadAbout}
                onDelete={() =>
                  aboutMain && setConfirmDelete({ type: "about", item: aboutMain })
                }
              />
            </div>
          </section>
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete?"
        message="This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        busy={formBusy || Boolean(busyKey)}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => void runConfirmDelete()}
      />
    </div>
  );
}
