export function formatCurrency(amount, currency = "PKR") {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function toInputDate(value = new Date()) {
  const d = new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
