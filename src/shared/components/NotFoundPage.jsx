import { Link } from "react-router-dom";
import { ArrowLeft, Home, Scissors } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { getPostLoginPath } from "@/features/auth/roles";

/**
 * Themed 404 — garment-shop atelier look (brass / ink / mist).
 */
export function NotFoundPage() {
  const { user, loading } = useAuth();
  const homePath = !loading && user ? getPostLoginPath(user) : "/login";
  const homeLabel = !loading && user ? "Back to dashboard" : "Go to sign in";

  return (
    <div className="relative min-h-screen overflow-hidden bg-atelier">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-brass/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-brass/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-12deg, transparent, transparent 11px, currentColor 11px, currentColor 12px)",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-brass-soft shadow-lg">
          <Scissors size={22} />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brass-deep">
          Tay<span className="italic">Gaff</span> · Lost stitch
        </p>

        <p className="mt-6 font-display text-[7rem] leading-none text-ink/10 sm:text-[9rem]">
          404
        </p>

        <h1 className="mt-2 font-display text-4xl text-ink sm:text-5xl">
          Page not <span className="italic text-brass">found</span>
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted sm:text-base">
          This pattern doesn’t exist in the shop ledger — the link may be wrong,
          outdated, or the page was moved.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={homePath}
            className="inline-flex items-center gap-2 rounded-xl bg-brass px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brass/90"
          >
            <Home size={16} />
            {homeLabel}
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-line bg-white/80 px-5 py-3 text-sm font-medium text-ink transition hover:bg-mist"
          >
            <ArrowLeft size={16} />
            Go back
          </button>
        </div>

        {!loading && user ? (
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted">
            <Link to="/inventory" className="hover:text-brass-deep hover:underline">
              Inventory
            </Link>
            <Link to="/bookings" className="hover:text-brass-deep hover:underline">
              Bookings
            </Link>
            <Link to="/customers" className="hover:text-brass-deep hover:underline">
              Customers
            </Link>
            <Link to="/stitching" className="hover:text-brass-deep hover:underline">
              Stitching
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
