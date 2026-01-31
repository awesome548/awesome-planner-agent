type RecordDot = {
  key: string;
  date: Date;
};

type RecordDotGridProps = {
  dots: RecordDot[];
  todayStart: Date;
  filledMap: Record<string, boolean>;
};

export default function RecordDotGrid({
  dots,
  todayStart,
  filledMap,
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
                ? "h-3 w-3 rounded-full bg-black transition-colors hover:bg-black/80"
                : isPast
                  ? "h-0.5 w-3 rounded-full bg-black/30 transition-colors hover:bg-black/50"
                  : isFuture
                    ? "h-1 w-1 rounded-full border-black/20 bg-black/20 transition-colors hover:border-black/40"
                    : "h-0.5 w-3 rounded-full bg-black/30 transition-colors hover:bg-black/50"
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
