"use client";

import { useEffect, useMemo, useState } from "react";
import { getUsageMap } from "@/lib/usage";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isoKey(year: number, monthIndex0: number, day: number) {
  const mm = String(monthIndex0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export default function UsagePage() {
  const [usage, setUsage] = useState<Record<string, boolean>>({});

  useEffect(() => { setUsage(getUsageMap()) });

  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usage Tracker ({year})</h1>
        <a className="underline" href="/">Back</a>
      </div>

      <p className="text-sm text-gray-600">
        Each month shows 30 dots. Black = planner used on that date.
      </p>

      <div className="space-y-4">
        {MONTHS.map((m, monthIdx) => (
          <div key={m} className="flex items-center gap-4">
            <div className="w-12 text-sm text-gray-700">{m}</div>

            <div className="grid grid-cols-30 gap-1">
              {Array.from({ length: 30 }).map((_, i) => {
                const day = i + 1;
                const key = isoKey(year, monthIdx, day);
                const filled = Boolean(usage[key]);

                return (
                  <div
                    key={key}
                    title={key}
                    className={[
                      "w-3 h-3 rounded-full border",
                      filled ? "bg-black border-black" : "bg-white border-gray-400",
                    ].join(" ")}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
