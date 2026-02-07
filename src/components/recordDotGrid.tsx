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
  // Optimized defaults for visibility across device types
  filledClassName = "h-3 w-3 rounded-full bg-black transition-all hover:scale-125 hover:bg-black/80",
  pastClassName = "h-1 w-3 rounded-full bg-black/20 transition-colors hover:bg-black/40",
  futureClassName = "h-1.5 w-1.5 rounded-full bg-zinc-200 transition-colors",
  fallbackClassName = "h-1 w-3 rounded-full bg-zinc-300",
}: RecordDotGridProps) {
  return (
    <div
      className="grid w-full gap-2 sm:gap-3"
      /* Responsive Logic: 
         Uses auto-fill to wrap dots naturally. 
         Adjust 'minmax' value (1rem/4 units) to control density. 
      */
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(1rem, 1fr))",
      }}
    >
      {dots.map(({ key, date }) => {
        const filled = Boolean(filledMap[key]);
        const day = new Date(date);
        day.setHours(0, 0, 0, 0);

        const isPast = day.getTime() < todayStart.getTime();
        const isFuture = day.getTime() > todayStart.getTime();

        const statusLabel = filled ? "Completed" : isFuture ? "Upcoming" : "Missed";

        return (
          <div
            key={key}
            title={`${key}: ${statusLabel}`}
            role="img"
            aria-label={`${key}: ${statusLabel}`}
            className="flex aspect-square h-5 w-5 items-center justify-center sm:h-6 sm:w-6"
          >
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
          </div>
        );
      })}
    </div>
  );
}