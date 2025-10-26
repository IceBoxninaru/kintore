export function parseISO(dateStr) {
  const [y, m, d] = String(dateStr || "")
    .split("-")
    .map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fmtISO(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}
