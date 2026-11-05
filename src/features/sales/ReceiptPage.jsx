import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { salesApi } from "@/features/sales/api";
import { ReceiptPreview } from "@/features/sales/ReceiptPreview";
import { getErrorMessage } from "@/shared/api/client";

export function ReceiptPage() {
  const { token } = useParams();
  const [sale, setSale] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const data = await salesApi.getByReceiptToken(token);
        if (!cancelled) setSale(data);
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Receipt not found"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-mist px-4 py-8">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
              TayGaff receipt
            </p>
            <h1 className="font-display text-3xl text-ink">Sale receipt</h1>
          </div>
          <Link
            to="/inventory/sales"
            className="rounded-xl border border-slate-line bg-white px-3 py-1.5 text-sm"
          >
            Sales history
          </Link>
        </div>

        {loading ? <p className="text-sm text-muted">Loading receipt…</p> : null}
        {error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}
        {sale ? <ReceiptPreview sale={sale} /> : null}
      </div>
    </div>
  );
}
