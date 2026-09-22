export function StatusBadge({ status }) {
  const tone =
    status === "In Stock" || status === "Paid"
      ? "bg-success/10 text-success"
      : status === "Low Stock" || status === "Partially Paid"
        ? "bg-brass/10 text-brass-deep"
        : status === "Out of Stock" || status === "Unpaid"
          ? "bg-danger/10 text-danger"
          : "bg-slate-canvas text-muted";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      {status}
    </span>
  );
}
