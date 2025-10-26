export function computeE1RM(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r)) return 0;
  return w + (w * r) / 40;
}
