import { toISODate } from "@/lib/utils";

export function startOfWeekMonday(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const distanceToMonday = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - distanceToMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getWeekDatesFromMonday(baseDate: Date) {
  const start = startOfWeekMonday(baseDate);
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function getCurrentWeekKeys(baseDate: Date) {
  return getWeekDatesFromMonday(baseDate).map((date) => toISODate(date));
}
