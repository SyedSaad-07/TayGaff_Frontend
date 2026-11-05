import { useEffect, useRef, useState } from "react";
import { Search, User, X } from "lucide-react";
import { bookingApi } from "@/features/bookings/api";
import { getErrorMessage } from "@/shared/api/client";

/**
 * Searchable customer picker for new bookings.
 * Searches name, phone, code, and booking folio (via API).
 */
export function BookingCustomerPicker({ value, selectedCustomer, onChange }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(selectedCustomer || null);
  const wrapRef = useRef(null);

  useEffect(() => {
    setSelected(selectedCustomer || null);
  }, [selectedCustomer]);

  // Resolve preset / existing customerId when parent only has an id.
  useEffect(() => {
    if (!value) {
      if (!selectedCustomer) setSelected(null);
      return;
    }
    if (selected?._id === value || selectedCustomer?._id === value) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await bookingApi.getCustomer(value);
        if (!cancelled) setSelected(data.customer || data);
      } catch {
        /* ignore — user can search again */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, selected?._id, selectedCustomer?._id]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced) {
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
          limit: 30,
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
    setSelected(customer);
    onChange?.(customer);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const clear = () => {
    setSelected(null);
    onChange?.(null);
    setQuery("");
    setResults([]);
  };

  return (
    <div ref={wrapRef} className="space-y-1">
      <span className="text-sm text-muted">Customer</span>
      {selected ? (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-brass/30 bg-brass/5 px-3 py-2.5">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <User size={14} className="text-brass" />
              {selected.name}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {selected.code}
              {selected.phone1 ? ` · ${selected.phone1}` : ""}
              {selected.phone2 ? ` · ${selected.phone2}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={clear}
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
              if (results.length || query.trim()) setOpen(true);
            }}
            placeholder="Search by name, phone, code, or folio…"
            className="w-full rounded-xl border border-slate-line bg-white py-2 pl-9 pr-3 text-sm"
            autoComplete="off"
          />
          {open && (query.trim() || searching) ? (
            <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-line bg-white shadow-lg">
              {searching ? (
                <p className="px-3 py-2 text-sm text-muted">Searching…</p>
              ) : null}
              {!searching && results.length === 0 && query.trim() ? (
                <p className="px-3 py-3 text-sm text-muted">
                  No customer matching “{query.trim()}”.
                </p>
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
            </div>
          ) : null}
        </div>
      )}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
