import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { bookingApi } from "@/features/bookings/api";
import { BookingCustomerPicker } from "@/features/bookings/BookingCustomerPicker";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { useBranch } from "@/features/branches/BranchContext";
import { ALL_BRANCHES } from "@/features/branches/branchUtils";
import { TENDER_METHODS } from "@/shared/constants";
import { useBookingStatusesInUse } from "@/features/bookings/useBookingStatuses";
import { getErrorMessage } from "@/shared/api/client";
import { formatCurrency, formatDate, toInputDate } from "@/shared/lib/format";

function safeDate(value) {
  if (!value) return "—";
  try {
    return formatDate(value);
  } catch {
    return "—";
  }
}

const emptyLine = () => ({
  itemCode: "",
  itemName: "",
  quantity: 1,
  amount: "",
  stitchingInstructions: "",
  remarks: "",
  measurementSnapshot: {},
});

function formatKarigarLabel(name, code) {
  const n = String(name || "").trim();
  const c = String(code || "").trim();
  if (n && c) return `${n} (${c})`;
  return n || c || "";
}

function lineKarigarLabels(lines = []) {
  const labels = [];
  const seen = new Set();
  for (const line of lines) {
    const code = line?.karigarCode || line?.karigar?.code || "";
    const name = line?.karigar?.name || "";
    const label = formatKarigarLabel(name, code);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels;
}

export function BookingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetCustomerId = searchParams.get("customerId") || "";
  const presetProfileId = searchParams.get("profileId") || "";
  const { statuses: filterStatuses } = useBookingStatusesInUse();
  const {
    branches,
    selectedBranchId,
    preferredBranchId,
    isAllBranches,
  } = useBranch();
  const createBranchId =
    !isAllBranches && selectedBranchId && selectedBranchId !== ALL_BRANCHES
      ? selectedBranchId
      : preferredBranchId && preferredBranchId !== ALL_BRANCHES
        ? preferredBranchId
        : branches[0]?._id || branches[0]?.id || "";

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(
    Boolean(presetCustomerId || presetProfileId)
  );
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [garmentItems, setGarmentItems] = useState([]);
  const [measureFields, setMeasureFields] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [presetApplied, setPresetApplied] = useState(false);

  const [form, setForm] = useState({
    customerId: presetCustomerId,
    bookingDate: toInputDate(),
    deliveryDate: "",
    discountTotal: "0",
    amountPaid: "0",
    paymentMethod: "Cash",
    notes: "",
    lines: [emptyLine()],
  });
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await bookingApi.list({
        page,
        limit: 20,
        search,
        status: status || undefined,
        overdue: overdue || undefined,
        customerId: presetCustomerId || undefined,
      });
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load bookings"));
    } finally {
      setLoading(false);
    }
  }, [page, search, status, overdue, presetCustomerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!showCreate) return;
    void (async () => {
      try {
        const [itemsData, fields] = await Promise.all([
          bookingApi.garmentItems(),
          bookingApi.measureFields(),
        ]);
        setGarmentItems(Array.isArray(itemsData) ? itemsData : []);
        setMeasureFields(Array.isArray(fields) ? fields : []);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load form data"));
      }
    })();
  }, [showCreate]);

  /** Prefill from customer page: customer + optional measurement profile. */
  useEffect(() => {
    if (!showCreate || presetApplied) return;
    if (!presetCustomerId && !presetProfileId) return;

    let cancelled = false;
    void (async () => {
      try {
        let customer = null;
        let profile = null;

        if (presetCustomerId) {
          const data = await bookingApi.getCustomer(presetCustomerId);
          customer = data?.customer || null;
          if (presetProfileId) {
            profile = (data?.measurementProfiles || []).find(
              (p) => p._id === presetProfileId || p.id === presetProfileId
            );
          }
        }

        if (!profile && presetProfileId) {
          const rows = await bookingApi.measurementProfiles({ id: presetProfileId });
          profile = Array.isArray(rows) ? rows[0] : null;
          if (!customer && profile?.customerId) {
            const data = await bookingApi.getCustomer(profile.customerId);
            customer = data?.customer || null;
          }
        }

        if (cancelled) return;

        const fields =
          profile?.fields instanceof Map
            ? Object.fromEntries(profile.fields)
            : profile?.fields || {};
        const itemCode = profile?.itemCode || "";
        const itemName =
          profile?.itemName ||
          profile?.garmentItem?.name ||
          "";

        setSelectedCustomer(customer);
        setForm((f) => ({
          ...f,
          customerId: customer?._id || presetCustomerId || f.customerId,
          lines: [
            {
              ...emptyLine(),
              itemCode,
              itemName,
              measurementSnapshot: { ...fields },
              stitchingInstructions: profile?.stitchingInstructions || "",
              remarks: profile?.remarks || "",
            },
          ],
        }));
        setActiveLineIdx(0);
        setPresetApplied(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            getErrorMessage(err, "Failed to load customer measurement profile")
          );
          setPresetApplied(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showCreate, presetCustomerId, presetProfileId, presetApplied]);

  useEffect(() => {
    if (!form.customerId || !form.lines[activeLineIdx]?.itemCode) {
      setProfiles([]);
      return;
    }
    void (async () => {
      try {
        const data = await bookingApi.measurementProfiles({
          customerId: form.customerId,
          itemCode: form.lines[activeLineIdx].itemCode,
        });
        setProfiles(Array.isArray(data) ? data : []);
      } catch {
        setProfiles([]);
      }
    })();
  }, [form.customerId, form.lines, activeLineIdx]);

  const groups = useMemo(() => {
    const map = {};
    for (const f of measureFields) {
      if (!map[f.group]) map[f.group] = [];
      map[f.group].push(f);
    }
    return map;
  }, [measureFields]);

  const updateLine = (idx, patch) => {
    setForm((f) => {
      const lines = f.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l));
      return { ...f, lines };
    });
  };

  const setMeasure = (idx, key, value) => {
    setForm((f) => {
      const lines = f.lines.map((l, i) => {
        if (i !== idx) return l;
        return {
          ...l,
          measurementSnapshot: { ...l.measurementSnapshot, [key]: value },
        };
      });
      return { ...f, lines };
    });
  };

  const applyProfile = (idx, profile) => {
    const fields =
      profile.fields instanceof Map
        ? Object.fromEntries(profile.fields)
        : profile.fields || {};
    updateLine(idx, {
      itemCode: profile.itemCode || form.lines[idx].itemCode,
      itemName:
        profile.itemName ||
        profile.garmentItem?.name ||
        form.lines[idx].itemName,
      measurementSnapshot: { ...fields },
      stitchingInstructions:
        profile.stitchingInstructions || form.lines[idx].stitchingInstructions,
      remarks: profile.remarks || form.lines[idx].remarks,
    });
  };

  const create = async () => {
    if (!form.customerId) {
      setError("Select a customer");
      return;
    }
    if (!form.lines.every((l) => l.itemCode)) {
      setError("Each line needs an item code");
      return;
    }
    if (!createBranchId) {
      setError("Select a branch before creating a booking");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        customerId: form.customerId,
        branch: createBranchId,
        bookingDate: form.bookingDate
          ? new Date(form.bookingDate).toISOString()
          : undefined,
        deliveryDate: form.deliveryDate
          ? new Date(form.deliveryDate).toISOString()
          : undefined,
        discountTotal: Number(form.discountTotal) || 0,
        amountPaid: Number(form.amountPaid) || 0,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
        lines: form.lines.map((l) => ({
          itemCode: l.itemCode,
          itemName: l.itemName,
          quantity: Number(l.quantity) || 1,
          amount: Number(l.amount) || 0,
          stitchingInstructions: l.stitchingInstructions,
          remarks: l.remarks,
          measurementSnapshot: Object.fromEntries(
            Object.entries(l.measurementSnapshot || {}).filter(([, v]) =>
              String(v || "").trim()
            )
          ),
        })),
      };
      const created = await bookingApi.create(payload);
      setShowCreate(false);
      setSelectedCustomer(null);
      navigate(`/bookings/${created._id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Create failed"));
    } finally {
      setSaving(false);
    }
  };

  const activeLine = form.lines[activeLineIdx] || form.lines[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
            Tailoring orders
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Bookings</h1>
          <p className="mt-1 text-sm text-muted">
            Search by folio, slip, or customer. Use View / Edit / Delete on each
            row. Legacy AMOUNT was mostly blank — totals may be 0 until you edit
            prices.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          New booking
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Folio, slip, customer…"
            className="w-full rounded-xl border border-slate-line bg-white py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm"
        >
          <option value="">All statuses</option>
          {filterStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-line bg-white px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={overdue}
            onChange={(e) => {
              setOverdue(e.target.checked);
              setPage(1);
            }}
          />
          Overdue only
        </label>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-line/80 bg-mist/50">
        <table className="min-w-full text-left text-sm">
            <thead className="bg-ink text-white/90">
            <tr>
              <th className="px-3 py-2.5">Folio</th>
              <th className="px-3 py-2.5">Customer</th>
              <th className="px-3 py-2.5">Karigar</th>
              <th className="px-3 py-2.5">Dates</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Payment</th>
              <th className="px-3 py-2.5">Total</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted">
                  No bookings. Create one or run the legacy import.
                </td>
              </tr>
            ) : (
              items.map((b) => {
                const karigarLabels = lineKarigarLabels(b.lines);
                return (
                <tr key={b._id} className="border-t border-slate-line/70 bg-white/70">
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/bookings/${b._id}`}
                      className="font-medium hover:underline"
                    >
                      {b.folio}
                    </Link>
                    <p className="text-xs text-muted">{b.bookingNumber}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    {b.customerName}
                    <p className="text-xs text-muted">{b.customerCode}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-ink/80">
                    {karigarLabels.length
                      ? karigarLabels.join(", ")
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {safeDate(b.bookingDate)}
                    <br />→ {safeDate(b.deliveryDate)}
                  </td>
                  <td className="px-3 py-2.5">{b.status}</td>
                  <td className="px-3 py-2.5">{b.paymentStatus}</td>
                  <td className="px-3 py-2.5">{formatCurrency(b.grandTotal)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        title="View details"
                        onClick={() => navigate(`/bookings/${b._id}`)}
                        className="rounded-lg border border-slate-line px-2 py-1.5 hover:bg-mist"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => navigate(`/bookings/${b._id}?edit=1`)}
                        className="rounded-lg border border-slate-line px-2 py-1.5 hover:bg-mist"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => setDeleteTarget(b)}
                        className="rounded-lg border border-danger/40 px-2 py-1.5 text-danger hover:bg-danger/5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Page {pagination.page} of {pagination.totalPages || 1} · {pagination.total}{" "}
          total
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-line px-3 py-1.5 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= (pagination.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-line px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/45 p-4">
          <div className="mx-auto max-w-4xl space-y-4 rounded-2xl bg-mist p-5 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-2xl">New booking</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setSelectedCustomer(null);
                }}
                className="rounded-xl border border-slate-line px-3 py-1.5 text-sm"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <BookingCustomerPicker
                  value={form.customerId}
                  selectedCustomer={selectedCustomer}
                  onChange={(customer) => {
                    setSelectedCustomer(customer);
                    setForm((f) => ({
                      ...f,
                      customerId: customer?._id || "",
                    }));
                  }}
                />
              </div>
              <label className="block text-sm">
                <span className="text-muted">Booking date</span>
                <input
                  type="date"
                  value={form.bookingDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bookingDate: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">Delivery date</span>
                <input
                  type="date"
                  value={form.deliveryDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deliveryDate: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {form.lines.map((line, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveLineIdx(idx)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    idx === activeLineIdx
                      ? "bg-ink text-white"
                      : "border border-slate-line bg-white"
                  }`}
                >
                  Line {idx + 1}
                  {line.itemCode ? `: ${line.itemCode}` : ""}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }));
                  setActiveLineIdx(form.lines.length);
                }}
                className="rounded-lg border border-dashed border-slate-line px-3 py-1.5 text-sm"
              >
                + Garment
              </button>
            </div>

            {activeLine ? (
              <div className="space-y-3 rounded-2xl border border-slate-line bg-white/70 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-sm">
                    <span className="text-muted">Item</span>
                    <select
                      value={activeLine.itemCode}
                      onChange={(e) => {
                        const item = garmentItems.find((g) => g.code === e.target.value);
                        updateLine(activeLineIdx, {
                          itemCode: e.target.value,
                          itemName: item?.name || activeLine.itemName || "",
                        });
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                    >
                      <option value="">Select item…</option>
                      {activeLine.itemCode &&
                      !garmentItems.some((g) => g.code === activeLine.itemCode) ? (
                        <option value={activeLine.itemCode}>
                          {activeLine.itemCode}
                          {activeLine.itemName ? ` — ${activeLine.itemName}` : " (from profile)"}
                        </option>
                      ) : null}
                      {garmentItems.map((g) => (
                        <option key={g._id || g.code} value={g.code}>
                          {g.code} — {g.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-muted">Qty</span>
                    <input
                      type="number"
                      min="1"
                      value={activeLine.quantity}
                      onChange={(e) =>
                        updateLine(activeLineIdx, { quantity: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-muted">Amount</span>
                    <input
                      type="number"
                      min="0"
                      value={activeLine.amount}
                      onChange={(e) =>
                        updateLine(activeLineIdx, { amount: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                    />
                  </label>
                </div>

                {profiles.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted">Load prior measures:</span>
                    {profiles.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => applyProfile(activeLineIdx, p)}
                        className="rounded-lg border border-slate-line px-2 py-1 text-xs"
                      >
                        {p.itemCode}
                        {p.folio ? ` · ${p.folio}` : ""} profile
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-3">
                  {Object.entries(groups).map(([group, fields]) => (
                    <div key={group}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                        {group.replace(/_/g, " ")}
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {fields.map((f) => (
                          <label key={f.key} className="block text-xs">
                            <span className="text-muted">{f.label}</span>
                            <input
                              value={activeLine.measurementSnapshot?.[f.key] || ""}
                              onChange={(e) =>
                                setMeasure(activeLineIdx, f.key, e.target.value)
                              }
                              className="mt-0.5 w-full rounded-lg border border-slate-line px-2 py-1.5"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <label className="block text-sm">
                  <span className="text-muted">Stitching instructions</span>
                  <textarea
                    value={activeLine.stitchingInstructions}
                    onChange={(e) =>
                      updateLine(activeLineIdx, {
                        stitchingInstructions: e.target.value,
                      })
                    }
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted">Remarks</span>
                  <textarea
                    value={activeLine.remarks}
                    onChange={(e) =>
                      updateLine(activeLineIdx, { remarks: e.target.value })
                    }
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                  />
                </label>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="text-muted">Discount</span>
                <input
                  type="number"
                  min="0"
                  value={form.discountTotal}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discountTotal: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">Advance paid</span>
                <input
                  type="number"
                  min="0"
                  value={form.amountPaid}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amountPaid: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">Advance method</span>
                <select
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paymentMethod: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-line px-3 py-2"
                >
                  {TENDER_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={create}
                className="rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white"
              >
                {saving ? "Saving…" : "Create booking"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-slate-line px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete booking ${deleteTarget?.folio || ""}`}
        message="It will be cancelled and hidden from the active list. This cannot be undone from here."
        confirmLabel="Delete booking"
        cancelLabel="Keep"
        tone="danger"
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleteBusy(true);
          setError("");
          try {
            await bookingApi.remove(deleteTarget._id);
            setDeleteTarget(null);
            await load();
          } catch (err) {
            setError(getErrorMessage(err, "Delete failed"));
          } finally {
            setDeleteBusy(false);
          }
        }}
      />
    </div>
  );
}
