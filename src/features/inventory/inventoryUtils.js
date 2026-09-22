export const PURCHASE_TYPES = ["Cash", "Credit"];
export const SALE_CATEGORIES = ["Clothing", "Stitching"];

export function statusBadgeClass(status) {
  switch (status) {
    case "In Stock":
      return "bg-success/10 text-success";
    case "Low Stock":
      return "bg-brass/10 text-brass-deep";
    case "Out of Stock":
      return "bg-danger/10 text-danger";
    case "Paid":
      return "bg-success/10 text-success";
    case "Partially Paid":
      return "bg-brass/10 text-brass-deep";
    case "Unpaid":
      return "bg-danger/10 text-danger";
    default:
      return "bg-slate-canvas text-muted";
  }
}

export function formatMeters(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString("en-PK", {
    maximumFractionDigits: 4,
  })}m`;
}
