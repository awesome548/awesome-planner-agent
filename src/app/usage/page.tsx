"use client";

import { useMemo } from "react";
import { Squares2X2Icon } from "@heroicons/react/24/outline";
import { 
  Flame, 
  CheckCircle2, 
  Calendar as CalendarIcon,
  TrendingUp,
  Target
} from "lucide-react";
import { toISODate } from "@/lib/utils";
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

export default function UsagePage() {
  const { data: usageMap = {} } = useUsageRecords();
  const { data: completionMap = {} } = useRoutineCompletions();

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
    const GRID_DAYS = 60;
    const yearStart = new Date(year, 0, 1);
    
    // If today is early in the year (within first 60 days), show first 60 days
    // Otherwise show the last 60 days ending today
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
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(#1a1a1a1a_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-10 pb-32">
        <PageHeader
          eyebrow="Records"
          title={String(year)}
          icon={<Squares2X2Icon className="h-5 w-5 text-black/40" />}
          right={
            <Badge variant="outline" className="text-[10px] uppercase tracking-[0.2em] border-black/10 text-black/40 font-bold">
              {daysLeft} days remaining
            </Badge>
          }
        />

        <section className="mt-12 space-y-12">
          {/* Planning Records */}
          <Card className="border-black/5 bg-white/60 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-[0.4em] text-black/30 font-bold flex items-center gap-2">
                  <CalendarIcon className="h-3 w-3" /> Day Planning
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">Consistency Tracker</CardTitle>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-primary text-lg font-bold">
                    {planningStats.streak} <Flame className="size-5 fill-current" />
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-black/30 font-bold">Streak</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-primary text-lg font-bold">
                    {planningStats.completedDays} <CheckCircle2 className="size-5" />
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-black/30 font-bold">Total</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-8 p-4 rounded-2xl bg-white/40 border border-black/[0.03]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-black/40 font-bold">
                    <Target className="h-3 w-3" /> Weekly Progress
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-black/50 border-none">
                    {planningStats.completedThisWeek} / {weeklyTargetDays} DAYS
                  </Badge>
                </div>
                <Progress value={planningStats.completionPercent} className="h-2 bg-primary/10" indicatorClassName="bg-primary" />
              </div>

              <div className="p-4 rounded-3xl bg-white/60 border border-black/[0.03] shadow-inner">
                <RecordDotGrid
                  dots={dots}
                  todayStart={todayStart}
                  filledMap={usageMap}
                  filledClassName="h-3 w-3 rounded-full bg-primary shadow-[0_0_8px_rgba(92,107,192,0.4)] transition-all hover:scale-125"
                  pastClassName="h-0.5 w-3 rounded-full bg-primary/20 transition-colors hover:bg-primary/40"
                />
              </div>
            </CardContent>
          </Card>

          {/* Routine Records */}
          <Card className="border-black/5 bg-white/60 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-[0.4em] text-black/30 font-bold flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" /> Morning Routine
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">Ritual Performance</CardTitle>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-secondary text-lg font-bold">
                    {routineStats.streak} <Flame className="size-5 fill-current" />
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-black/30 font-bold">Streak</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-secondary text-lg font-bold">
                    {routineStats.completedDays} <CheckCircle2 className="size-5" />
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-black/30 font-bold">Total</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-8 p-4 rounded-2xl bg-white/40 border border-black/[0.03]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-black/40 font-bold">
                    <Target className="h-3 w-3" /> Ritual Mastery
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-black/50 border-none">
                    {routineStats.completedThisWeek} / {weeklyTargetDays} DAYS
                  </Badge>
                </div>
                <Progress value={routineStats.completionPercent} className="h-2 bg-secondary/10" indicatorClassName="bg-secondary" />
              </div>

              <div className="p-4 rounded-3xl bg-white/60 border border-black/[0.03] shadow-inner">
                <RecordDotGrid
                  dots={dots}
                  todayStart={todayStart}
                  filledMap={completionMap}
                  filledClassName="h-3 w-3 rounded-full bg-secondary shadow-[0_0_8px_rgba(38,166,154,0.4)] transition-all hover:scale-125"
                  pastClassName="h-0.5 w-3 rounded-full bg-secondary/20 transition-colors hover:bg-secondary/40"
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
