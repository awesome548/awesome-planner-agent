const KEY = "plannerUsage:v1";

// Stores as: { "2026-01-24": true, ... }
export function getUsageMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function markTodayUsed() {
  if (typeof window === "undefined") return;
  const map = getUsageMap();
  const today = new Date();
  const key = toISODate(today);
  map[key] = true;
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function toISODate(d: Date) {
  // local date -> YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}