import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, UserPlus } from "lucide-react";
import { usersApi } from "@/features/settings/usersApi";
import { MODULE_OPTIONS } from "@/features/auth/roles";
import { getErrorMessage } from "@/shared/api/client";

const emptyForm = () => ({
  name: "",
  email: "",
  password: "",
  permissions: [],
  isActive: true,
});

export function UsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUsers(await usersApi.list());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load users"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormError("");
    setShowPassword(false);
    setPanel("create");
  };

  const openEdit = (user) => {
    setEditId(user._id);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      permissions: Array.isArray(user.permissions) ? [...user.permissions] : [],
      isActive: user.isActive !== false,
    });
    setFormError("");
    setShowPassword(false);
    setPanel("edit");
  };

  const togglePermission = (key) => {
    setForm((f) => {
      const has = f.permissions.includes(key);
      return {
        ...f,
        permissions: has
          ? f.permissions.filter((p) => p !== key)
          : [...f.permissions, key],
      };
    });
  };

  const save = async () => {
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (!form.email.trim()) {
      setFormError("Email is required");
      return;
    }
    if (!editId && !form.password) {
      setFormError("Password is required");
      return;
    }
    if (form.permissions.length === 0) {
      setFormError("Select at least one section");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      if (editId) {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          permissions: form.permissions,
          isActive: form.isActive,
        };
        if (form.password) payload.password = form.password;
        await usersApi.update(editId, payload);
      } else {
        await usersApi.create({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          permissions: form.permissions,
          isActive: form.isActive,
        });
      }
      setPanel(null);
      setEditId(null);
      setForm(emptyForm());
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const staffUsers = users.filter((u) => u.role !== "ADMIN");
  const adminUsers = users.filter((u) => u.role === "ADMIN");

  return (
    <section className="space-y-4 rounded-2xl border border-slate-line/80 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass-deep">
            Access control
          </p>
          <h2 className="mt-1 font-display text-2xl text-ink">Users</h2>
          <p className="mt-1 text-sm text-muted">
            Create shop users and choose which sections they can open (e.g. stitching
            only, booking only, or both).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add user
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading users…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-3">Name</th>
                <th className="pb-2 pr-3">Email</th>
                <th className="pb-2 pr-3">Access</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2"> </th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((u) => (
                <tr key={u._id} className="border-t border-slate-line/60">
                  <td className="py-2.5 pr-3 font-medium">{u.name}</td>
                  <td className="py-2.5 pr-3 text-muted">{u.email}</td>
                  <td className="py-2.5 pr-3">
                    <span className="rounded-lg bg-ink/5 px-2 py-0.5 text-xs font-semibold">
                      Admin · full access
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    {u.isActive === false ? "Inactive" : "Active"}
                  </td>
                  <td className="py-2.5 text-xs text-muted">—</td>
                </tr>
              ))}
              {staffUsers.length === 0 ? (
                <tr className="border-t border-slate-line/60">
                  <td colSpan={5} className="py-6 text-muted">
                    No staff users yet. Add someone with only the sections they need.
                  </td>
                </tr>
              ) : (
                staffUsers.map((u) => {
                  const perms = Array.isArray(u.permissions) ? u.permissions : [];
                  const labels =
                    perms.length === 0
                      ? "All sections (legacy)"
                      : perms
                          .map(
                            (k) =>
                              MODULE_OPTIONS.find((o) => o.key === k)?.label || k
                          )
                          .join(", ");
                  return (
                    <tr key={u._id} className="border-t border-slate-line/60">
                      <td className="py-2.5 pr-3 font-medium">{u.name}</td>
                      <td className="py-2.5 pr-3 text-muted">{u.email}</td>
                      <td className="py-2.5 pr-3 text-ink/80">{labels}</td>
                      <td className="py-2.5 pr-3">
                        {u.isActive === false ? (
                          <span className="text-danger">Inactive</span>
                        ) : (
                          "Active"
                        )}
                      </td>
                      <td className="py-2.5">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brass-deep hover:underline"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {panel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-mist p-5 shadow-xl">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-brass" />
              <h3 className="font-display text-2xl text-ink">
                {editId ? "Edit user" : "Add user"}
              </h3>
            </div>
            <p className="text-sm text-muted">
              Staff login with email + password. Tick every section they may use.
            </p>

            {formError ? (
              <p className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            ) : null}

            <label className="block text-sm">
              <span className="text-muted">Full name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">
                Password{editId ? " (leave blank to keep)" : ""}
              </span>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-line bg-white py-2 pl-3 pr-11 text-sm"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div>
              <p className="text-sm text-muted">Section access</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {MODULE_OPTIONS.map((opt) => {
                  const checked = form.permissions.includes(opt.key);
                  return (
                    <label
                      key={opt.key}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                        checked
                          ? "border-brass/40 bg-brass/5"
                          : "border-slate-line bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(opt.key)}
                        className="rounded border-slate-line"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>

            {editId ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className="rounded border-slate-line"
                />
                Active (can sign in)
              </label>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setPanel(null);
                  setEditId(null);
                }}
                className="rounded-xl border border-slate-line px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : editId ? "Save changes" : "Create user"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
