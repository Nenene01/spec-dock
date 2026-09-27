export const splitRatioStorageKey = "specdock:split-ratio";

export function normalizeSplitRatio(value) {
  if (value == null || value === "") return 50;
  const ratio = Number(value);
  return Number.isFinite(ratio) ? Math.min(80, Math.max(20, Math.round(ratio))) : 50;
}

export function splitRatioFromPointer(clientX, bounds) {
  if (!bounds || bounds.width <= 0) return 50;
  return normalizeSplitRatio(((clientX - bounds.left) / bounds.width) * 100);
}

export function splitGridColumns(ratio) {
  const left = normalizeSplitRatio(ratio);
  return `minmax(0, ${left}fr) 6px minmax(0, ${100 - left}fr)`;
}
