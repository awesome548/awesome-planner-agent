import { useMemo } from "react";
import { toISODate } from "@/lib/utils";
import { getWeekDatesFromMonday } from "@/lib/week";

type WeekBarProps = {
  statusMap: Record<string, boolean>;
  className?: string;
  // Preserving your original styling props
  usedClassName?: string;
  pastClassName?: string;
  futureClassName?: string;
  fallbackClassName?: string;
};

export default function WeekBar({
  statusMap,
  className = "",
  usedClassName = "h-3 w-3 rounded-full bg-black",
  pastClassName = "h-0.5 w-3 rounded-full bg-black/30",
  futureClassName = "h-2 w-2 rounded-full bg-zinc-200 transition-colors hover:border-zinc-500",
  fallbackClassName = "h-0.5 w-3 rounded-full bg-zinc-400 transition-colors hover:bg-zinc-500",
}: WeekBarProps) {
  // Calculate "Today" once to prevent render jitter
  const { todayStart, weekDates } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    const weekDates = getWeekDatesFromMonday(todayStart);

    return { todayStart, weekDates };
  }, []);

  return (
    <section className={`py-8 ${className}`.trim()}>
      <div className="grid grid-cols-7 gap-3 text-xs tracking-[0.25em] uppercase text-black/60 text-center">
        {weekDates.map((d) => (
          <div key={d.toString()}>
            {d.toLocaleDateString("en-US", { weekday: "short" })}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-7 gap-3 place-items-center">
        {weekDates.map((d) => {
          const iso = toISODate(d);
          const used = Boolean(statusMap[iso]);

          // Compare whole-day timestamps
          const dayTime = d.getTime();
          const todayTime = todayStart.getTime();

          const isPast = dayTime < todayTime;
          const isFuture = dayTime > todayTime;

          let label = `${d.toLocaleDateString()}: `;
          if (used) label += "Completed";
          else if (isPast) label += "Missed";
          else if (isFuture) label += "Upcoming";
          else label += "Today";

          return (
            <span
              key={iso}
              className="flex items-center justify-center h-6 w-6" // Fixed height container for alignment
              role="status"
              aria-label={label}
              title={label}
            >
              {used ? (
                <span className={usedClassName} />
              ) : isPast ? (
                <span className={pastClassName} />
              ) : isFuture ? (
                <span className={futureClassName} />
              ) : (
                <span className={fallbackClassName} />
              )}
            </span>
          );
        })}
      </div>
    </section>
  );
}
