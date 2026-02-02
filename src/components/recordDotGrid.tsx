type RecordDot = {
  key: string;
  date: Date;
};

type RecordDotGridProps = {
  dots: RecordDot[];
  todayStart: Date;
  filledMap: Record<string, boolean>;
  filledClassName?: string;
  pastClassName?: string;
  futureClassName?: string;
  fallbackClassName?: string;
};

export default function RecordDotGrid({
  dots,
  todayStart,
  filledMap,
  filledClassName = "h-3 w-3 rounded-full bg-black transition-colors hover:bg-black/80",
  pastClassName = "h-0.5 w-3 rounded-full bg-black/30 transition-colors hover:bg-black/50",
  futureClassName = "h-1 w-1 rounded-full bg-zinc-200 transition-colors hover:bg-zinc-300",
  fallbackClassName = "h-0.5 w-3 rounded-full bg-zinc-400 transition-colors hover:bg-zinc-500",
}: RecordDotGridProps) {
  return (
    <div className="grid grid-cols-30 gap-2 sm:gap-3 md:gap-3">
      {dots.map(({ key, date }) => {
        const filled = Boolean(filledMap[key]);
        const day = new Date(date);
        day.setHours(0, 0, 0, 0);
        const isPast = day.getTime() < todayStart.getTime();
        const isFuture = day.getTime() > todayStart.getTime();
        const Dot = (
          <span
            className={
              filled
                ? filledClassName
                : isPast
                  ? pastClassName
                  : isFuture
                    ? futureClassName
                    : fallbackClassName
            }
          />
        );

        return (
          <div
            key={key}
            title={key}
            className="h-3.5 w-3.5 flex items-center justify-center"
          >
            {Dot}
          </div>
        );
      })}
    </div>
  );
}
