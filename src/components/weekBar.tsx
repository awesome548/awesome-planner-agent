import { useMemo } from "react";
import { toISODate } from "@/lib/utils";

type WeekBarProps = {
  statusMap: Record<string, boolean>;
  className?: string;
};

export default function WeekBar({ statusMap, className = "" }: WeekBarProps) {
  const todayStart = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  }, []);

  const weekDates = useMemo(() => {
    const base = new Date();
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);

  return (
    <section className={`mt-6 ${className}`.trim()}>
      <div className="grid grid-cols-7 gap-3 text-xs tracking-[0.25em] uppercase text-black/60">
        {weekDates.map((d) => (
          <div key={d.toDateString()} className="text-center">
            {d.toLocaleDateString("en-US", { weekday: "short" })}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-3 place-items-center">
        {weekDates.map((d) => {
          const used = Boolean(statusMap[toISODate(d)]);
          const day = new Date(d);
          day.setHours(0, 0, 0, 0);
          const isPast = day.getTime() < todayStart.getTime();
          const isFuture = day.getTime() > todayStart.getTime();
          return (
            <span key={d.toDateString()} className="flex items-center justify-center h-4 w-4">
              {used ? (
                <span className="h-3 w-3 rounded-full bg-black" />
              ) : isPast ? (
                <span className="h-0.5 w-3 rounded-full bg-black/30" />
              ) : isFuture ? (
                <span className="h-2 w-2 rounded-full border border-black/20 bg-transparent" />
              ) : (
                <span className="h-0.5 w-3 rounded-full bg-black/30" />
              )}
            </span>
          );
        })}
      </div>
    </section>
  );
}
