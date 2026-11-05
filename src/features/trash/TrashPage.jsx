import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Search, Trash2 } from "lucide-react";
import { trashApi } from "@/features/trash/api";
import { getErrorMessage } from "@/shared/api/client";

export function TrashPage() {
  const [counts, setCounts] = useState({});
  const [types, setTypes] = useState([]);
  const [type, setType] = useState("booking");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadMeta = useCallback(async () => {
    const [t, c] = await Promise.all([trashApi.types(), trashApi.counts()]);
    setTypes(t || []);
    setCounts(c || {});
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await trashApi.list({ type, page, limit: 30, search });
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load trash"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [type, page, search]);

  useEffect(() => {
    loadMeta().catch(() => {});
  }, [loadMeta]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function handleRestore(item) {
    const id = item.id || item._id;
    setBusyId(id);
    setError("");
    try {
      await trashApi.restore(type, id);
      await Promise.all([loadMeta(), loadList()]);
    } catch (err) {
      setError(getErrorMessage(err, "Restore failed"));
    } finally {
      setBusyId(null);
    }
  }

  const totalInType = counts?.[type]?.total ?? data?.pagination?.total ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
          Admin
        </p>
        <h1 className="mt-2 flex items-center gap-3 font-display text-4xl text-ink">
          <Trash2 className="text-brass-deep" size={32} />
          Trash
        </h1>
        <p className="mt-2 text-sm text-muted">
          Soft-deleted records. Restore to put them back into the live shop lists.
          Nothing here is permanently erased.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {types.map((t) => {
          const n = counts?.[t.key]?.total ?? 0;
          const active = type === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setType(t.key);
                setPage(1);
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-ink text-white"
                  : "border border-slate-line bg-white text-ink/70 hover:bg-mist"
              }`}
            >
              {t.label}
              <span className={`ml-2 text-xs ${active ? "text-brass-soft" : "text-ink/40"}`}>
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search trash…"
            className="w-full rounded-xl border border-slate-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brass"
          />
        </div>
        <p className="text-xs text-ink/45">{totalInType} in trash</p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-line bg-white">
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-ink/45">Loading…</p>
        ) : !data?.items?.length ? (
          <p className="px-4 py-10 text-center text-sm text-ink/45">
            Trash is empty for this type.
          </p>
        ) : (
          <ul className="divide-y divide-slate-line/80">
            {data.items.map((item) => {
              const id = item.id || item._id;
              return (
                <li
                  key={id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {item.displayTitle || id}
                    </p>
                    <p className="mt-0.5 text-xs text-ink/45">
                      Deleted{" "}
                      {item.deletedAt
                        ? new Date(item.deletedAt).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === id}
                    onClick={() => handleRestore(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-3 py-2 text-xs font-medium text-ink transition hover:bg-mist disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    Restore
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {data?.pagination?.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-line px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-ink/50">
            Page {data.pagination.page} / {data.pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-line px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
