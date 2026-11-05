import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { getPostLoginPath } from "@/features/auth/roles";
import { getErrorMessage } from "@/shared/api/client";
import { BrandLogo } from "@/shared/components/BrandLogo";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@taygaff.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const loggedInUser = await login(email.trim(), password);
      navigate(getPostLoginPath(loggedInUser), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to sign in"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-login-panel lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-brass/20 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-brass/10 blur-3xl" />
        </div>
        <div className="relative">
          <BrandLogo className="h-14 w-auto max-w-[260px] object-contain object-left" />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-brass-soft">
            Premium men&apos;s tailoring
          </p>
          <h1 className="mt-6 font-display text-6xl leading-none text-white xl:text-7xl">
            Crafted <span className="italic text-brass-soft">elegance</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/65">
            Bespoke suits, shirts &amp; formalwear — expense intelligence for a
            growing tailor shop.
          </p>
        </div>
        <div className="relative grid gap-4 text-sm text-white/60">
          <p>Track daily spend across transportation, salaries, utilities, and more.</p>
          <p>Built to expand into appointments, sizes, and full shop operations.</p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-atelier px-6 py-12">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md animate-[fadeUp_0.55s_ease-out]"
        >
          <BrandLogo className="h-12 w-auto max-w-[220px] object-contain object-left" />
          <h2 className="mt-6 font-display text-3xl text-ink sm:text-4xl">
            Sign <span className="italic text-brass">in</span>
          </h2>
          <p className="mt-2 text-sm text-muted">
            Access your shop dashboard and ledger.
          </p>

          <label className="mt-8 block text-sm font-medium text-ink/80">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-line bg-mist px-4 py-3 outline-none transition focus:border-brass"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-ink/80">
            Password
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-line bg-mist px-4 py-3 pr-12 outline-none transition focus:border-brass"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3.5 text-ink/45 transition hover:text-ink"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error ? (
            <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-brass px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-brass-deep disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Enter dashboard"}
          </button>
        </form>
      </section>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
