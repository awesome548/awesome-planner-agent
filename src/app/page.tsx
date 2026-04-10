"use client";

import { useMemo } from "react";
import { CalendarDaysIcon, SunIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { Flame, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toISODate } from "@/lib/utils";
import { useUsageRecords } from "@/lib/api/usage";
import { useRoutineCompletions } from "@/lib/api/routine";
import BottomBar from "@/components/bottomBar";
import PageHeader from "@/components/pageHeader";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { data: usageMap = {} } = useUsageRecords();
  const { data: completionMap = {} } = useRoutineCompletions();

  const todayKey = useMemo(() => toISODate(new Date()), []);

  const plannedToday = !!usageMap[todayKey];
  const routineToday = !!completionMap[todayKey];

  const planStreak = useMemo(() => {
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i++) {
      if (usageMap[toISODate(cursor)]) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [usageMap]);

  const routineStreak = useMemo(() => {
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i++) {
      if (completionMap[toISODate(cursor)]) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [completionMap]);

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#f8f6f1] text-[#0c0c0c] selection:bg-primary/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f8f6f1_55%,_#f1efe8_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(#1a1a1a1a_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-10 pb-36 flex min-h-screen flex-col">
        <PageHeader
          eyebrow="Dashboard"
          title={todayLabel}
          icon={<Squares2X2Icon className="size-6 text-black/40" />}
        />

        <section className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Plan Card */}
          <Link href="/plan" className="group">
            <Card className="border-black/5 bg-white/60 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden transition-all group-hover:shadow-3xl group-hover:bg-white/80 h-full">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <CalendarDaysIcon className="size-5 text-primary" />
                  </div>
                  <ArrowRight className="size-4 text-black/20 group-hover:text-black/50 transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight">Day Planner</h3>
                  <p className="text-xs text-black/40 mt-1">AI-powered daily scheduling</p>
                </div>
                <div className="flex items-center gap-3 mt-auto pt-2">
                  <Badge
                    variant="outline"
                    className={`text-[9px] uppercase tracking-[0.2em] font-bold border-none ${
                      plannedToday ? "bg-primary/10 text-primary" : "bg-black/5 text-black/30"
                    }`}
                  >
                    {plannedToday ? "Planned" : "Not yet"}
                  </Badge>
                  {planStreak > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-primary">
                      {planStreak} <Flame className="size-3 fill-current" />
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Morning Card */}
          <Link href="/morning" className="group">
            <Card className="border-black/5 bg-white/60 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden transition-all group-hover:shadow-3xl group-hover:bg-white/80 h-full">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-secondary/10 flex items-center justify-center">
                    <SunIcon className="size-5 text-secondary" />
                  </div>
                  <ArrowRight className="size-4 text-black/20 group-hover:text-black/50 transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight">Morning Routine</h3>
                  <p className="text-xs text-black/40 mt-1">Build consistent habits</p>
                </div>
                <div className="flex items-center gap-3 mt-auto pt-2">
                  <Badge
                    variant="outline"
                    className={`text-[9px] uppercase tracking-[0.2em] font-bold border-none ${
                      routineToday ? "bg-secondary/10 text-secondary" : "bg-black/5 text-black/30"
                    }`}
                  >
                    {routineToday ? "Completed" : "Not yet"}
                  </Badge>
                  {routineStreak > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-secondary">
                      {routineStreak} <Flame className="size-3 fill-current" />
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Records Card */}
          <Link href="/usage" className="group">
            <Card className="border-black/5 bg-white/60 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden transition-all group-hover:shadow-3xl group-hover:bg-white/80 h-full">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-black/5 flex items-center justify-center">
                    <Squares2X2Icon className="size-5 text-black/40" />
                  </div>
                  <ArrowRight className="size-4 text-black/20 group-hover:text-black/50 transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight">Records</h3>
                  <p className="text-xs text-black/40 mt-1">Streaks and consistency</p>
                </div>
                <div className="flex items-center gap-3 mt-auto pt-2">
                  <Badge
                    variant="outline"
                    className="text-[9px] uppercase tracking-[0.2em] font-bold border-none bg-black/5 text-black/30"
                  >
                    {Object.values(usageMap).filter(Boolean).length + Object.values(completionMap).filter(Boolean).length} days tracked
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>
      </div>

      <BottomBar active="home" />
    </main>
  );
}
