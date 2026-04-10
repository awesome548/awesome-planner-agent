import { toISODate } from "@/lib/utils";

/**
 * Count consecutive days (backwards from today) where `map[dateKey]` is truthy.
 */
export function calculateStreak(
  map: Record<string, boolean>,
  from: Date = new Date(),
  maxDays = 365
): number {
  let streak = 0;
  const cursor = new Date(from);
  for (let i = 0; i < maxDays; i++) {
    if (map[toISODate(cursor)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
