"use client";

import { useEffect, useMemo, useState } from "react";
import { Squares2X2Icon } from "@heroicons/react/24/outline";
import { getUsageMap, toISODate } from "@/lib/usage";
import { getRoutineCompletionMap, setRoutineCompletion } from "@/lib/morning-routine";
import BottomBar from "@/components/bottomBar";
import PageHeader from "@/components/pageHeader";

function daysInYear(year: number) {
  return new Date(year + 1, 0, 0).getDate();
}

function dayOfYear(d: Date) {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export default function UsagePage() {
  const [usage, setUsage] = useState<Record<string, boolean>>({});
  const [routineCompletion, setRoutineCompletionMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const next = await getUsageMap();
      const routine = await getRoutineCompletionMap();
      if (active) setUsage(next);
      if (active) setRoutineCompletionMap(routine);
    })();
    return () => {
      active = false;
    };
  }, []);

  const year = useMemo(() => new Date().getFullYear(), []);
  const totalDays = useMemo(() => 365, []);
  const today = useMemo(() => new Date(), []);
  const daysLeft = useMemo(() => Math.max(totalDays - dayOfYear(today), 0), [totalDays, today]);
  const todayStart = useMemo(() => {
    const base = new Date(today);
    base.setHours(0, 0, 0, 0);
    return base;
  }, [today]);

  const dots = useMemo(() => {
    return Array.from({ length: totalDays }).map((_, i) => {
      const d = new Date(year, 0, 1 + i);
      return { key: toISODate(d), date: d };
    });
  }, [totalDays, year]);

  const routineStats = useMemo(() => {
    const completedDays = Object.values(routineCompletion).filter(Boolean).length;
    let streak = 0;
    const cursor = new Date(todayStart);
    for (let i = 0; i < totalDays; i += 1) {
      const key = toISODate(cursor);
      if (routineCompletion[key]) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return { completedDays, streak };
  }, [routineCompletion, todayStart, totalDays]);

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#f8f6f1] text-[#0c0c0c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#ffffff_0%,#f8f6f1_55%,#f1efe8_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(#1a1a1a1a_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-10 pb-32">
        <PageHeader
          eyebrow="Records"
          title={String(year)}
          icon={<Squares2X2Icon className="h-5 w-5" />}
          right={<div className="text-xs uppercase tracking-[0.2em] text-black/50">{daysLeft} days left</div>}
        />

        <div className="mt-6 grid grid-cols-30 gap-2 sm:gap-3 md:gap-3">
          {dots.map(({ key, date }) => {
            const filled = Boolean(usage[key]);
            const day = new Date(date);
            day.setHours(0, 0, 0, 0);
            const isPast = day.getTime() < todayStart.getTime();
            const isFuture = day.getTime() > todayStart.getTime();
            return (
              <div
                key={key}
                title={key}
                className="h-3.5 w-3.5 flex items-center justify-center cursor-pointer"
              >
                {filled ? (
                  <span className="h-3 w-3 rounded-full bg-black transition-colors hover:bg-black/80" />
                ) : isPast ? (
                  <span className="h-0.5 w-3 rounded-full bg-black/30 transition-colors hover:bg-black/50" />
                ) : isFuture ? (
                  <span className="h-2 w-2 rounded-full border border-black/20 bg-transparent transition-colors hover:border-black/40" />
                ) : (
                  <span className="h-0.5 w-3 rounded-full bg-black/30 transition-colors hover:bg-black/50" />
                )}
              </div>
            );
          })}
        </div>

        <section className="mt-14">
          <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur px-6 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-black/50">Morning routine</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Consistency tracker</h2>
              </div>
              <div className="text-right text-xs uppercase tracking-[0.25em] text-black/50">
                <div>{routineStats.streak} day streak</div>
                <div className="mt-1">{routineStats.completedDays} completed</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-30 gap-2 sm:gap-3 md:gap-3">
              {dots.map(({ key, date }) => {
                const filled = Boolean(routineCompletion[key]);
                const day = new Date(date);
                day.setHours(0, 0, 0, 0);
                const isPast = day.getTime() < todayStart.getTime();
                const isFuture = day.getTime() > todayStart.getTime();
                return (
                  <button
                    key={key}
                    type="button"
                    title={key}
                    onClick={async () => {
                      const nextValue = !routineCompletion[key];
                      setRoutineCompletionMap((prev) => ({ ...prev, [key]: nextValue }));
                      await setRoutineCompletion(date, nextValue);
                    }}
                    className="h-3.5 w-3.5 flex items-center justify-center"
                    aria-label={`Toggle morning routine ${key}`}
                  >
                    {filled ? (
                      <span className="h-3 w-3 rounded-full bg-black transition-colors hover:bg-black/80" />
                    ) : isPast ? (
                      <span className="h-0.5 w-3 rounded-full bg-black/30 transition-colors hover:bg-black/50" />
                    ) : isFuture ? (
                      <span className="h-2 w-2 rounded-full border border-black/20 bg-transparent transition-colors hover:border-black/40" />
                    ) : (
                      <span className="h-0.5 w-3 rounded-full bg-black/30 transition-colors hover:bg-black/50" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 text-xs tracking-[0.2em] text-black/50 uppercase">
              Tap any day to check off completion
            </div>
          </div>
        </section>
      </div>

      <BottomBar active="usage" />
    </main>
  );
}
