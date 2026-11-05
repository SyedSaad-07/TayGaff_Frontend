import { useEffect, useRef, useState } from "react";
import { Search, UserPlus, X, User } from "lucide-react";
import { bookingApi } from "@/features/bookings/api";
import { getErrorMessage } from "@/shared/api/client";

/**
 * Search customers by name / phone / code; select fills POS fields.
 * Offers create-new when nothing matches (or via explicit action).
 */
export function PosCustomerPicker({
  selected,
  customerName,
  customerPhone,
  onSelect,
  onClear,
  onNameChange,
  onPhoneChange,
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    phone1: "",
    phone2: "",
    address: "",
    address2: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced || debounced.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setError("");
    (async () => {
      try {
        const data = await bookingApi.listCustomers({
          search: debounced,
          limit: 12,
          page: 1,
        });
        if (!cancelled) {
          setResults(data.items || []);
          setOpen(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            getErrorMessage(err, "Customer search failed")
          );
          setResults([]);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (customer) => {
    onSelect(customer);
    setQuery("");
    setResults([]);
    setOpen(false);
    setShowCreate(false);
  };

  const openCreate = (seed = {}) => {
    const phoneGuess =
      seed.phone1 || customerPhone || (/^\d/.test(query) ? query : "");
    setCreateForm({
      name: seed.name || customerName || (/^\d/.test(query) ? "" : query) || "",
      phone1: phoneGuess,
      phone2: seed.phone2 || "",
      address: seed.address || "",
      address2: seed.address2 || "",
      notes: seed.notes || "",
    });
    setShowCreate(true);
    setOpen(false);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setError("Customer name is required");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const customer = await bookingApi.createCustomer({
        name: createForm.name.trim(),
        phone1: createForm.phone1.trim(),
        phone2: createForm.phone2.trim(),
        address: createForm.address.trim(),
        address2: createForm.address2.trim(),
        notes: createForm.notes.trim(),
      });
      pick(customer);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create customer"));
    } finally {
      setCreating(false);
    }
  };

  const noMatches =
    debounced.length >= 2 && !searching && results.length === 0 && open;

  return (
    <div ref={wrapRef} className="space-y-2">
      {selected ? (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-brass/30 bg-brass/5 px-3 py-2.5">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <User size={14} className="text-brass" />
              {selected.name}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Code {selected.code}
              {selected.phone1 ? ` · ${selected.phone1}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClear();
              setQuery("");
            }}
            className="rounded-lg p-1 text-muted hover:bg-white hover:text-ink"
            aria-label="Clear customer"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (results.length || query.trim().length >= 2) setOpen(true);
            }}
            placeholder="Search customer by name or phone…"
            className="w-full rounded-xl border border-slate-line bg-white py-2 pl-9 pr-3 text-sm"
            autoComplete="off"
          />
          {open && (results.length > 0 || noMatches || searching) ? (
            <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-line bg-white shadow-lg">
              {searching ? (
                <p className="px-3 py-2 text-sm text-muted">Searching…</p>
              ) : null}
              {results.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => pick(c)}
                  className="flex w-full flex-col items-start gap-0.5 border-b border-slate-line/60 px-3 py-2 text-left text-sm last:border-0 hover:bg-mist"
                >
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className="text-xs text-muted">
                    {c.code}
                    {c.phone1 ? ` · ${c.phone1}` : ""}
                    {c.phone2 ? ` · ${c.phone2}` : ""}
                  </span>
                </button>
              ))}
              {noMatches ? (
                <div className="px-3 py-3">
                  <p className="text-sm text-muted">
                    No customer matching “{debounced}”.
                  </p>
                  <button
                    type="button"
                    onClick={() => openCreate()}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brass-deep hover:underline"
                  >
                    <UserPlus size={14} />
                    Create new customer
                  </button>
                </div>
              ) : null}
              {!noMatches && debounced.length >= 2 ? (
                <button
                  type="button"
                  onClick={() => openCreate()}
                  className="flex w-full items-center gap-1.5 border-t border-slate-line px-3 py-2 text-sm font-medium text-brass-deep hover:bg-mist"
                >
                  <UserPlus size={14} />
                  Create new customer
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={customerName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Customer name (optional walk-in)"
          className="rounded-xl border border-slate-line px-3 py-2 text-sm"
        />
        <input
          value={customerPhone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="Phone (optional)"
          className="rounded-xl border border-slate-line px-3 py-2 text-sm"
        />
      </div>

      {!selected ? (
        <button
          type="button"
          onClick={() => openCreate()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brass-deep hover:underline"
        >
          <UserPlus size={12} />
          Create customer in master
        </button>
      ) : null}

      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : null}

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <form
            onSubmit={submitCreate}
            className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-mist p-5 shadow-xl"
          >
            <h3 className="font-display text-2xl text-ink">New customer</h3>
            <p className="text-sm text-muted">
              Same fields as Customers — saved to master and applied to this sale.
            </p>
            <label className="block text-sm">
              <span className="text-muted">Full name</span>
              <input
                required
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted">Phone 1</span>
                <input
                  value={createForm.phone1}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, phone1: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">Phone 2</span>
                <input
                  value={createForm.phone2}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, phone2: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-muted">Address</span>
              <input
                value={createForm.address}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, address: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Address 2</span>
              <input
                value={createForm.address2}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, address2: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Notes</span>
              <textarea
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={creating}
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-slate-line px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {creating ? "Saving…" : "Create & use"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
