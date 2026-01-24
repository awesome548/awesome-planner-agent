"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getUsageMap, toISODate } from "@/lib/usage";

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

  useEffect(() => {
    setUsage(getUsageMap());
  }, []);

  const year = useMemo(() => new Date().getFullYear(), []);
  const totalDays = useMemo(() => 365, []);
  const today = useMemo(() => new Date(), []);
  const daysLeft = useMemo(() => Math.max(totalDays - dayOfYear(today), 0), [totalDays, today]);

  const dots = useMemo(() => {
    return Array.from({ length: totalDays }).map((_, i) => {
      const d = new Date(year, 0, 1 + i);
      return { key: toISODate(d), date: d };
    });
  }, [totalDays, year]);

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#f8f6f1] text-[#0c0c0c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#ffffff_0%,#f8f6f1_55%,#f1efe8_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(#1a1a1a1a_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-10 pb-32">
        <div className="flex items-center justify-center">
          <h1 className="text-3xl font-semibold tracking-tight">{year}</h1>
        </div>

        <div className="mt-6 grid grid-cols-30 gap-2 sm:gap-3 md:gap-3">
          {dots.map(({ key }) => {
            const filled = Boolean(usage[key]);
            return (
              <div
                key={key}
                title={key}
                className={[
                  "h-2.5 w-2.5 rounded-full transition-colors cursor-pointer",
                  filled ? "bg-black hover:bg-black/80" : "bg-black/15 hover:bg-black/30",
                ].join(" ")}
              />
            );
          })}
        </div>

        <div className="mt-6 text-right text-xs tracking-[0.2em] text-black/50 uppercase">
          {daysLeft} days left
        </div>
      </div>

      <div className="fixed bottom-6 inset-x-0 flex justify-center">
        <div className="rounded-full bg-white/90 border border-black/10 shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur px-1 py-1 flex items-center gap-1">
          <Link className="px-4 py-1.5 text-sm rounded-full bg-black text-white transition hover:bg-black/90" href="/usage">
            All
          </Link>
          <Link
            className="px-4 py-1.5 text-sm rounded-full text-black/70 transition hover:bg-black/5 hover:text-black"
            href="/"
          >
            Day
          </Link>
        </div>
      </div>
    </main>
  );
}
