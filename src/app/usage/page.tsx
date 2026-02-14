"use client";

import { useMemo } from "react";
import { Squares2X2Icon } from "@heroicons/react/24/outline";
import { FireIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import { toISODate } from "@/lib/utils";
import { getCurrentWeekKeys } from "@/lib/week";
import { useRoutineStore } from "@/lib/morning-routine-store";
import { useUsageStore } from "@/lib/usage-store";
import BottomBar from "@/components/bottomBar";
import PageHeader from "@/components/pageHeader";
import RecordCard from "@/components/recordCard";
import RecordDotGrid from "@/components/recordDotGrid";

function dayOfYear(d: Date) {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export default function UsagePage() {
  const { usageMap } = useUsageStore();
  const { completionMap } = useRoutineStore();

  const year = useMemo(() => new Date().getFullYear(), []);
  const totalDays = useMemo(() => 365, []);
  const today = useMemo(() => new Date(), []);
  const daysLeft = useMemo(() => Math.max(totalDays - dayOfYear(today), 0), [totalDays, today]);
  const weeklyTargetDays = 6;
  const todayStart = useMemo(() => {
    const base = new Date(today);
    base.setHours(0, 0, 0, 0);
    return base;
  }, [today]);
  const currentWeekKeys = useMemo(() => {
    return getCurrentWeekKeys(todayStart);
  }, [todayStart]);

  const dots = useMemo(() => {
    return Array.from({ length: totalDays }).map((_, i) => {
      const d = new Date(year, 0, 1 + i);
      return { key: toISODate(d), date: d };
    });
  }, [totalDays, year]);

  const planningStats = useMemo(() => {
    const completedDays = Object.values(usageMap).filter(Boolean).length;
    let streak = 0;
    const cursor = new Date(todayStart);
    for (let i = 0; i < totalDays; i += 1) {
      const key = toISODate(cursor);
      if (usageMap[key]) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    const completedThisWeek = currentWeekKeys.reduce((sum, key) => {
      return usageMap[key] ? sum + 1 : sum;
    }, 0);
    const completionPercent = Math.round((Math.min(completedThisWeek, weeklyTargetDays) / weeklyTargetDays) * 100);
    return { completedDays, streak, completedThisWeek, completionPercent };
  }, [usageMap, todayStart, totalDays, currentWeekKeys, weeklyTargetDays]);

  const routineStats = useMemo(() => {
    const completedDays = Object.values(completionMap).filter(Boolean).length;
    let streak = 0;
    const cursor = new Date(todayStart);
    for (let i = 0; i < totalDays; i += 1) {
      const key = toISODate(cursor);
      if (completionMap[key]) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    const completedThisWeek = currentWeekKeys.reduce((sum, key) => {
      return completionMap[key] ? sum + 1 : sum;
    }, 0);
    const completionPercent = Math.round((Math.min(completedThisWeek, weeklyTargetDays) / weeklyTargetDays) * 100);
    return { completedDays, streak, completedThisWeek, completionPercent };
  }, [completionMap, todayStart, totalDays, currentWeekKeys, weeklyTargetDays]);

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

        <section className="mt-10">
          <RecordCard
            eyebrow="planning"
            title="Daily planning"
            right={
              <>
                <div className="flex items-center gap-1">
                  {planningStats.streak} <FireIcon className="size-5 text-primary" />
                </div>
                <div className="mt-1 flex items-center gap-1">
                  {planningStats.completedDays} <CheckCircleIcon className="size-5 text-primary" />
                </div>
              </>
            }
          >
            <div className="mb-4 rounded-2xl border border-black/10 bg-white/80 p-3 shadow-inner">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-black/60">
                <span>Weekly completion</span>
                <span>
                  {planningStats.completionPercent}% ({planningStats.completedThisWeek}/{weeklyTargetDays})
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-black/10 bg-black/5">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${planningStats.completionPercent}%` }}
                />
              </div>
            </div>
            <RecordDotGrid
              dots={dots}
              todayStart={todayStart}
              filledMap={usageMap}
              filledClassName="h-3 w-3 rounded-full bg-primary transition-colors hover:bg-primary/80"
              pastClassName="h-0.5 w-3 rounded-full bg-primary/40 transition-colors hover:bg-primary/55"
            />
          </RecordCard>
        </section>

        <section className="mt-10">
          <RecordCard
            eyebrow="Morning routine"
            title="Routine tracker"
            right={
              <>
                <div className="flex items-center gap-1">
                  {routineStats.streak} <FireIcon className="size-5 text-secondary" />
                </div>
                <div className="mt-1 flex items-center gap-1">
                  {routineStats.completedDays} <CheckCircleIcon className="size-5 text-secondary" />
                </div>
              </>
            }
          >
            <div className="mb-4 rounded-2xl border border-black/10 bg-white/80 p-3 shadow-inner">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-black/60">
                <span>Weekly completion</span>
                <span>
                  {routineStats.completionPercent}% ({routineStats.completedThisWeek}/{weeklyTargetDays})
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-black/10 bg-black/5">
                <div
                  className="h-full rounded-full bg-secondary transition-all"
                  style={{ width: `${routineStats.completionPercent}%` }}
                />
              </div>
            </div>
            <RecordDotGrid
              dots={dots}
              todayStart={todayStart}
              filledMap={completionMap}
              filledClassName="h-3 w-3 rounded-full bg-secondary transition-colors hover:bg-secondary/80"
              pastClassName="h-0.5 w-3 rounded-full bg-secondary/40 transition-colors hover:bg-secondary/55"
            />
          </RecordCard>
        </section>
      </div>

      <BottomBar active="usage" />
    </main>
  );
}
