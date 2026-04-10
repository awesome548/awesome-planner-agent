"use client";

import { useMemo } from "react";
import {
  LayoutGrid,
  Flame,
  CheckCircle2,
  Calendar as CalendarIcon,
  TrendingUp,
  Target
} from "lucide-react";
import { toISODate } from "@/lib/utils";
import { calculateStreak } from "@/lib/streak";
import { getCurrentWeekKeys } from "@/lib/week";
import { useRoutineCompletions } from "@/lib/api/routine";
import { useUsageRecords } from "@/lib/api/usage";
import BottomBar from "@/components/bottomBar";
import PageHeader from "@/components/pageHeader";
import RecordDotGrid from "@/components/recordDotGrid";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function dayOfYear(d: Date) {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

const EMPTY_MAP: Record<string, boolean> = {};
const TOTAL_DAYS = 365;

export default function UsagePage() {
  const { data: usageMap = EMPTY_MAP } = useUsageRecords();
  const { data: completionMap = EMPTY_MAP } = useRoutineCompletions();

  const year = new Date().getFullYear();
  const today = useMemo(() => new Date(), []);
  const daysLeft = Math.max(TOTAL_DAYS - dayOfYear(today), 0);
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
    const GRID_DAYS = 60;
    const yearStart = new Date(year, 0, 1);

    let startPoint: Date;
    if (dayOfYear(todayStart) <= GRID_DAYS) {
      startPoint = yearStart;
    } else {
      startPoint = new Date(todayStart);
      startPoint.setDate(todayStart.getDate() - (GRID_DAYS - 1));
    }

    return Array.from({ length: GRID_DAYS }).map((_, i) => {
      const d = new Date(startPoint);
      d.setDate(startPoint.getDate() + i);
      return { key: toISODate(d), date: d };
    });
  }, [year, todayStart]);

  const planningStats = useMemo(() => {
    const completedDays = Object.values(usageMap).filter(Boolean).length;
    const streak = calculateStreak(usageMap, todayStart, TOTAL_DAYS);
    const completedThisWeek = currentWeekKeys.reduce((sum, key) => {
      return usageMap[key] ? sum + 1 : sum;
    }, 0);
    const completionPercent = Math.round((Math.min(completedThisWeek, weeklyTargetDays) / weeklyTargetDays) * 100);
    return { completedDays, streak, completedThisWeek, completionPercent };
  }, [usageMap, todayStart, TOTAL_DAYS, currentWeekKeys, weeklyTargetDays]);

  const routineStats = useMemo(() => {
    const completedDays = Object.values(completionMap).filter(Boolean).length;
    const streak = calculateStreak(completionMap, todayStart, TOTAL_DAYS);
    const completedThisWeek = currentWeekKeys.reduce((sum, key) => {
      return completionMap[key] ? sum + 1 : sum;
    }, 0);
    const completionPercent = Math.round((Math.min(completedThisWeek, weeklyTargetDays) / weeklyTargetDays) * 100);
    return { completedDays, streak, completedThisWeek, completionPercent };
  }, [completionMap, todayStart, TOTAL_DAYS, currentWeekKeys, weeklyTargetDays]);

  return (
    <main className="min-h-screen bg-white bg-dots text-black">
      <div className="max-w-2xl mx-auto px-6 pt-16 pb-32">
        <PageHeader
          eyebrow="Records"
          title={String(year)}
          icon={<LayoutGrid className="h-5 w-5 text-black/30" />}
          right={
            <Badge variant="outline" className="text-[10px] uppercase tracking-[0.15em] border-black/8 text-black/35 font-medium">
              {daysLeft} days left
            </Badge>
          }
        />

        <section className="mt-12 space-y-8">
          {/* Planning Records */}
          <Card className="border-black/6 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-black/30 font-medium flex items-center gap-1.5">
                  <CalendarIcon className="h-3 w-3" /> Day Planning
                </div>
                <CardTitle className="text-lg font-semibold tracking-tight">Consistency</CardTitle>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-primary text-base font-semibold">
                    {planningStats.streak} <Flame className="size-4 fill-current" />
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-black/25">streak</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-primary text-base font-semibold">
                    {planningStats.completedDays} <CheckCircle2 className="size-4" />
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-black/25">total</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-3 rounded-lg bg-black/[0.02] border border-black/4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-black/30 font-medium">
                    <Target className="h-3 w-3" /> Weekly
                  </div>
                  <span className="text-[10px] font-medium text-black/40">
                    {planningStats.completedThisWeek}/{weeklyTargetDays}
                  </span>
                </div>
                <Progress value={planningStats.completionPercent} className="h-1.5 bg-primary/8" indicatorClassName="bg-primary" />
              </div>

              <div className="p-3 rounded-xl border border-black/4">
                <RecordDotGrid
                  dots={dots}
                  todayStart={todayStart}
                  filledMap={usageMap}
                  filledClassName="h-3 w-3 rounded-full bg-primary transition-all hover:scale-125"
                  pastClassName="h-0.5 w-3 rounded-full bg-primary/15"
                />
              </div>
            </CardContent>
          </Card>

          {/* Routine Records */}
          <Card className="border-black/6 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-black/30 font-medium flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" /> Morning Routine
                </div>
                <CardTitle className="text-lg font-semibold tracking-tight">Performance</CardTitle>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-secondary text-base font-semibold">
                    {routineStats.streak} <Flame className="size-4 fill-current" />
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-black/25">streak</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-secondary text-base font-semibold">
                    {routineStats.completedDays} <CheckCircle2 className="size-4" />
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-black/25">total</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-3 rounded-lg bg-black/[0.02] border border-black/4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-black/30 font-medium">
                    <Target className="h-3 w-3" /> Weekly
                  </div>
                  <span className="text-[10px] font-medium text-black/40">
                    {routineStats.completedThisWeek}/{weeklyTargetDays}
                  </span>
                </div>
                <Progress value={routineStats.completionPercent} className="h-1.5 bg-secondary/8" indicatorClassName="bg-secondary" />
              </div>

              <div className="p-3 rounded-xl border border-black/4">
                <RecordDotGrid
                  dots={dots}
                  todayStart={todayStart}
                  filledMap={completionMap}
                  filledClassName="h-3 w-3 rounded-full bg-secondary transition-all hover:scale-125"
                  pastClassName="h-0.5 w-3 rounded-full bg-secondary/15"
                />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <BottomBar active="usage" />
    </main>
  );
}
