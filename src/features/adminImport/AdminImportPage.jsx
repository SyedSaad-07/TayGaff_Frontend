import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  FileArchive,
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Database,
} from "lucide-react";
import { adminImportApi } from "@/features/adminImport/api";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { getErrorMessage } from "@/shared/api/client";

const STEPS = [
  "Prerequisites",
  "Upload",
  "Check pack",
  "Preview",
  "Import",
  "Done",
];

function statusStep(status) {
  switch (status) {
    case "uploaded":
    case "validated":
      return 2;
    case "dry_running":
    case "dry_run":
      return 3;
    case "importing":
      return 4;
    case "completed":
      return 5;
    case "failed":
      return 2;
    default:
      return 0;
  }
}

function statusLabel(status) {
  switch (status) {
    case "uploaded":
      return "Pack received";
    case "validated":
      return "Pack ready";
    case "dry_running":
      return "Checking…";
    case "dry_run":
      return "Preview ready";
    case "importing":
      return "Importing…";
    case "completed":
      return "Import finished";
    case "failed":
      return "Needs attention";
    default:
      return status || "";
  }
}

export function AdminImportPage() {
  const [policy, setPolicy] = useState(null);
  const [job, setJob] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmImport, setConfirmImport] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const p = await adminImportApi.policy();
        setPolicy(p);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load import policy"));
      }
    })();
  }, []);

  const stepIndex = useMemo(() => {
    if (!job) return 1;
    return statusStep(job.status);
  }, [job]);

  const refreshJob = useCallback(async (id) => {
    const next = await adminImportApi.getJob(id);
    setJob(next);
    return next;
  }, []);

  const onUpload = async () => {
    if (!file) {
      setError("Choose a Booking.zip file first");
      return;
    }
    setBusy("upload");
    setError("");
    try {
      const next = await adminImportApi.uploadPack(file);
      setJob(next);
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed"));
    } finally {
      setBusy("");
    }
  };

  const onDryRun = async () => {
    if (!job?.id) return;
    setBusy("dry-run");
    setError("");
    try {
      const next = await adminImportApi.dryRun(job.id);
      setJob(next);
    } catch (err) {
      setError(getErrorMessage(err, "Preview failed"));
      if (job?.id) {
        try {
          await refreshJob(job.id);
        } catch {
          /* ignore */
        }
      }
    } finally {
      setBusy("");
    }
  };

  const onApply = async () => {
    if (!job?.id) return;
    setConfirmImport(false);
    setBusy("apply");
    setError("");
    try {
      const next = await adminImportApi.apply(job.id);
      setJob(next);
    } catch (err) {
      setError(getErrorMessage(err, "Import failed"));
      if (job?.id) {
        try {
          await refreshJob(job.id);
        } catch {
          /* ignore */
        }
      }
    } finally {
      setBusy("");
    }
  };

  const validationOk = job?.validation?.ok;
  const canDryRun =
    job &&
    validationOk &&
    !busy &&
    job.status !== "importing" &&
    job.status !== "dry_running";
  const canApply =
    job &&
    (job.status === "dry_run" || job.status === "completed") &&
    !busy;
  const previewDone = job?.status === "dry_run" || job?.status === "completed";
  const importDone = job?.status === "completed";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
          Admin · Data
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">
          Booking pack import
        </h1>
        <p className="mt-2 text-sm text-muted">
          Upload FoxPro Booking DBF/SQL as a ZIP after a clean database. Stitching
          history only — no live money from legacy amounts.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              i <= stepIndex
                ? "bg-brass/20 text-brass-deep"
                : "bg-mist text-muted"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {error ? (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-line/80 bg-white p-5 space-y-3">
        <h2 className="font-display text-2xl text-ink">1 · Prerequisites</h2>
        <p className="text-sm text-muted">
          Prefer an empty Postgres database (migrations applied). Re-import is
          idempotent on codes / foils / slips, but will reset imported booking
          money to zero.
        </p>
        <p className="text-sm text-ink">
          This imports stitching masters + LEG-* bookings only, and does not
          import customer or supplier balances.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-line/80 bg-white p-5 space-y-4">
        <h2 className="font-display text-2xl text-ink">2 · Upload Booking.zip</h2>
        <div className="rounded-xl border border-dashed border-brass/40 bg-brass/5 px-4 py-3 text-sm text-ink/80">
          <p className="font-medium text-brass-deep">
            {policy?.banner ||
              "Booking amounts will be zero. No customer/supplier balances imported."}
          </p>
          <p className="mt-2 text-xs text-muted">
            Required:{" "}
            {(policy?.requiredFiles || []).join(", ") ||
              "ITEMS, CUSTOMER, KARIGAR, RATE, MEASURE, BOOKING"}{" "}
            (garments, customers, karigars, rates, measurement profiles, bookings).
            Optional: {(policy?.optionalFiles || []).join(", ") || "CUSTOM"}.
            Imported bookings are always status Delivered (legacy flags ignored).
            Soft-deleted BOOKING foils are skipped (live foils only). Suppliers
            are not imported — add manually. Cloth / MEH / backups are ignored.
          </p>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-line bg-mist/50 px-4 py-8 text-center hover:border-brass/50">
          <FileArchive className="text-brass" size={28} />
          <span className="text-sm font-medium text-ink">
            {file ? file.name : "Choose .zip (flat or Booking/ folder)"}
          </span>
          <input
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <button
          type="button"
          disabled={!file || Boolean(busy)}
          onClick={() => void onUpload()}
          className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white hover:bg-brass-deep disabled:opacity-50"
        >
          {busy === "upload" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          Upload &amp; validate
        </button>
      </section>

      {job ? (
        <section className="rounded-2xl border border-slate-line/80 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl text-ink">3 · Pack check</h2>
            <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink/70">
              {statusLabel(job.status)}
            </span>
          </div>

          {validationOk ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 size={16} /> Required files present
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-danger">
              <AlertTriangle size={16} />{" "}
              {(job.validation?.errors || []).join("; ") || "Pack incomplete"}
            </p>
          )}

          {job.validation?.missingOptional?.length ? (
            <p className="text-sm text-amber-800">
              Optional file not in pack:{" "}
              {job.validation.missingOptional.join(", ")}. Import can continue
              without it.
            </p>
          ) : null}

          {previewDone && !importDone ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 size={16} /> Preview completed — pack looks ready to
              import.
            </p>
          ) : null}

          {busy === "dry-run" ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Loader2 size={16} className="animate-spin" /> Checking pack…
              this can take a few minutes.
            </p>
          ) : null}

          {busy === "apply" ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Loader2 size={16} className="animate-spin" /> Importing… please
              wait.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canDryRun}
              onClick={() => void onDryRun()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-line bg-mist px-4 py-2.5 text-sm font-semibold text-ink hover:border-brass/50 disabled:opacity-50"
            >
              {busy === "dry-run" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              4 · Preview
            </button>
            <button
              type="button"
              disabled={!canApply}
              onClick={() => setConfirmImport(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-sm font-semibold text-white hover:bg-brass-deep disabled:opacity-50"
            >
              {busy === "apply" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Database size={16} />
              )}
              5 · Confirm import
            </button>
          </div>

          {importDone ? (
            <div className="space-y-3 rounded-xl border border-success/30 bg-success/5 px-4 py-4">
              <p className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 size={16} /> Import finished. Customers, garments,
                karigars, measures, and LEG-* bookings are in the system.
              </p>
              <p className="text-sm text-muted">
                Enter customer opening balances manually. Add suppliers when
                needed.
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link className="text-brass-deep underline" to="/customers">
                  Customers
                </Link>
                <Link className="text-brass-deep underline" to="/bookings">
                  Bookings
                </Link>
                <Link className="text-brass-deep underline" to="/inventory">
                  Inventory / POS
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <ConfirmDialog
        open={confirmImport}
        title="Import Booking pack?"
        message="This writes customers, items, karigars, measures, and LEG-* bookings. Money stays zero and every imported booking is status Delivered. Continue?"
        confirmLabel="Import now"
        tone="warning"
        busy={busy === "apply"}
        onConfirm={() => void onApply()}
        onCancel={() => setConfirmImport(false)}
      />
    </div>
  );
}
