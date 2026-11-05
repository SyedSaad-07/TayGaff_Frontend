export function formatCurrency(amount, currency = "PKR") {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

const APP_TZ = "Asia/Karachi";

/** Calendar Y-M-D parts in Asia/Karachi (avoids UTC day-shift for date-only values). */
function karachiParts(value = new Date()) {
  if (typeof value === "string") {
    const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
    }
  }
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(value));
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { y: get("year"), m: get("month"), d: get("day") };
}

export function formatDate(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "string") {
    const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      // Format date-only without timezone shift
      const utc = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(utc);
    }
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function toInputDate(value = new Date()) {
  const { y, m, d } = karachiParts(value);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export const CATEGORY_COLORS = {
  "Transportation Exp": "#3b5bdb",
  "Entertainment Exp": "#5b7cfa",
  "Utility Bills": "#2a9d8f",
  "Sales Commission": "#4c6ef5",
  "Salary Exp": "#1c2b46",
  "Maintainance Exp": "#748ffc",
  "Misc Exp": "#6b7280",
};
