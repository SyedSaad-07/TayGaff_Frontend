/**
 * App-styled confirm dialog (replaces window.confirm / prompt).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  reasonLabel = "",
  reasonValue = "",
  onReasonChange,
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-danger text-white hover:bg-danger/90"
      : tone === "warning"
        ? "bg-amber-600 text-white hover:bg-amber-600/90"
        : "bg-brass text-white hover:bg-brass/90";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel?.();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-line bg-mist p-5 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass-deep">
          Please confirm
        </p>
        <h2 id="confirm-dialog-title" className="mt-2 font-display text-2xl text-ink">
          {title}
        </h2>
        {message ? (
          <p className="mt-2 text-sm leading-relaxed text-ink/70">{message}</p>
        ) : null}

        {reasonLabel ? (
          <label className="mt-4 block text-sm">
            <span className="text-muted">{reasonLabel}</span>
            <textarea
              value={reasonValue}
              onChange={(e) => onReasonChange?.(e.target.value)}
              rows={2}
              disabled={busy}
              placeholder="Optional…"
              className="mt-1 w-full rounded-xl border border-slate-line bg-white px-3 py-2 text-sm"
            />
          </label>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-slate-line bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 ${confirmClass}`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
