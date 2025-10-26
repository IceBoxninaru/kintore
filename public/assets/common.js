export function formatNumber(value, digits = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  const fixed = num.toFixed(digits);
  return digits > 0 ? fixed.replace(/\.0+$/, "") : fixed;
}

export async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}
