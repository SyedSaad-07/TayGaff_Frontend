import { CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isAdmin } from "@/features/auth/roles";

export function BookingsPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brass/10 text-brass">
        <CalendarClock size={26} />
      </div>
      <h1 className="font-display text-4xl text-ink sm:text-5xl">
        Booking <span className="italic text-brass">module</span>
      </h1>
      <p className="text-sm leading-relaxed text-muted">
        Appointments, fittings, and sizing will live here in one booking
        workspace. The shell is ready — the full workflow comes next.
      </p>
      {isAdmin(user) ? (
        <Link
          to="/modules"
          className="inline-flex rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brass-deep"
        >
          Back to modules
        </Link>
      ) : null}
    </div>
  );
}
