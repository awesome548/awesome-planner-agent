"use client";

import { useMemo } from "react";
import { CalendarDays, Sun, LayoutGrid, Flame, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toISODate } from "@/lib/utils";
import { calculateStreak } from "@/lib/streak";
import { useUsageRecords } from "@/lib/api/usage";
import { useRoutineCompletions } from "@/lib/api/routine";
import BottomBar from "@/components/bottomBar";
import PageHeader from "@/components/pageHeader";

import { Card, CardContent } from "@/components/ui/card";

const EMPTY_MAP: Record<string, boolean> = {};

export default function DashboardPage() {
  const { data: usageMap = EMPTY_MAP } = useUsageRecords();
  const { data: completionMap = EMPTY_MAP } = useRoutineCompletions();

  const todayKey = useMemo(() => toISODate(new Date()), []);

  const plannedToday = !!usageMap[todayKey];
  const routineToday = !!completionMap[todayKey];

  const planStreak = useMemo(() => calculateStreak(usageMap), [usageMap]);
  const routineStreak = useMemo(() => calculateStreak(completionMap), [completionMap]);
  const totalTracked = useMemo(
    () => Object.values(usageMap).filter(Boolean).length + Object.values(completionMap).filter(Boolean).length,
    [usageMap, completionMap]
  );

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, []);

  return (
    <main className="min-h-screen bg-white bg-dots text-black">
      <div className="max-w-2xl mx-auto px-6 pt-16 pb-32">
        <PageHeader
          eyebrow="Dashboard"
          title={todayLabel}
          icon={<LayoutGrid className="size-5 text-black/30" />}
        />

        <section className="mt-16 space-y-3">
          {/* Plan Card */}
          <Link href="/plan" className="group block">
            <Card className="border-black/6 bg-white shadow-none hover:bg-black/[0.02] transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                  <CalendarDays className="size-[18px] text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium">Day Planner</h3>
                  <p className="text-xs text-black/40 mt-0.5">
                    {plannedToday ? (
                      <span className="text-primary">Planned today</span>
                    ) : (
                      "Not yet planned"
                    )}
                    {planStreak > 0 && (
                      <span className="inline-flex items-center gap-0.5 ml-2 text-primary font-medium">
                        {planStreak} <Flame className="size-3 fill-current" />
                      </span>
                    )}
                  </p>
                </div>
                <ArrowRight className="size-4 text-black/15 group-hover:text-black/40 transition-colors shrink-0" />
              </CardContent>
            </Card>
          </Link>

          {/* Morning Card */}
          <Link href="/morning" className="group block">
            <Card className="border-black/6 bg-white shadow-none hover:bg-black/[0.02] transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-secondary/8 flex items-center justify-center shrink-0">
                  <Sun className="size-[18px] text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium">Morning Routine</h3>
                  <p className="text-xs text-black/40 mt-0.5">
                    {routineToday ? (
                      <span className="text-secondary">Completed today</span>
                    ) : (
                      "Not yet completed"
                    )}
                    {routineStreak > 0 && (
                      <span className="inline-flex items-center gap-0.5 ml-2 text-secondary font-medium">
                        {routineStreak} <Flame className="size-3 fill-current" />
                      </span>
                    )}
                  </p>
                </div>
                <ArrowRight className="size-4 text-black/15 group-hover:text-black/40 transition-colors shrink-0" />
              </CardContent>
            </Card>
          </Link>

          {/* Records Card */}
          <Link href="/usage" className="group block">
            <Card className="border-black/6 bg-white shadow-none hover:bg-black/[0.02] transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-black/[0.04] flex items-center justify-center shrink-0">
                  <LayoutGrid className="size-[18px] text-black/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium">Records</h3>
                  <p className="text-xs text-black/40 mt-0.5">
                    {totalTracked} days tracked
                  </p>
                </div>
                <ArrowRight className="size-4 text-black/15 group-hover:text-black/40 transition-colors shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </section>
      </div>

      <BottomBar active="home" />
    </main>
  );
}
