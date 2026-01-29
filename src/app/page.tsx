"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { getUsageMap, markTodayUsed, toISODate } from "@/lib/usage";

type Task = {
  title: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  duration_minutes: number;
  difficulty: "simple" | "normal" | "deep";
  notes?: string;
};

export default function Home() {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [plan, setPlan] = useState<{ tasks: Task[] } | null>(null);
  const [draftTasks, setDraftTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [usage, setUsage] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const next = await getUsageMap();
      if (active) setUsage(next);
    })();
    return () => {
      active = false;
    };
  }, []);

  const today = useMemo(() => new Date(), []);
  const todayLabel = useMemo(() => {
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  }, [today]);

  const weekDates = useMemo(() => {
    const base = new Date();
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);

  async function generatePlan() {
    setLoading(true);
    setMsg("");
    setPlan(null);

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, timeZone }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to generate plan");
      return;
    }

    setPlan(data.plan);
    setDraftTasks(data.plan?.tasks ?? []);
    await markTodayUsed();
    setUsage(await getUsageMap());
  }

  async function confirmAndCreate() {
    if (!plan) return;
    setCreating(true);
    setMsg("");

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch("/api/calendar/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: { tasks: draftTasks }, timeZone }),
    });

    const data = await res.json();
    setCreating(false);

    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to create events");
      return;
    }

    setMsg(`✅ Created ${data.createdCount} events in Google Calendar`);
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#f8f6f1] text-[#0c0c0c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f8f6f1_55%,_#f1efe8_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(#1a1a1a1a_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-10 pb-36 flex min-h-screen flex-col">
        <header className="flex items-center justify-between">
          <div className="text-2xl font-semibold tracking-tight">{todayLabel}</div>
          <button
            className="rounded-full border border-black/10 px-3 py-1.5 text-xs uppercase tracking-[0.3em] transition hover:border-black/40 hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
            onClick={() => (session ? signOut() : signIn("google"))}
          >
            {session ? "Sign out" : "Sign in"}
          </button>
        </header>

        <section className="mt-6">
          <div className="grid grid-cols-7 gap-3 text-xs tracking-[0.25em] uppercase text-black/60">
            {weekDates.map((d) => (
              <div key={d.toDateString()} className="text-center">
                {d.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-3 place-items-center">
            {weekDates.map((d) => {
              const used = Boolean(usage[toISODate(d)]);
              return used ? (
                <span key={d.toDateString()} className="h-2 w-2 rounded-full bg-black" />
              ) : (
                <span key={d.toDateString()} className="h-0.5 w-5 rounded-full bg-black/30" />
              );
            })}
          </div>
        </section>

        <section className="mt-14 flex flex-col items-center text-center text-black/70">
          <div className="text-lg tracking-[0.2em] uppercase">Plan your day today</div>
        </section>

        <section className="flex-1 flex items-center">
          <div className="w-full max-w-3xl mx-auto rounded-3xl border border-black/10 bg-white/70 backdrop-blur px-6 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
            <div className="text-xs uppercase tracking-[0.35em] text-black/50">Add your tasks</div>
            <textarea
              className="mt-3 w-full rounded-2xl border border-black/10 bg-white/80 p-4 text-sm leading-relaxed shadow-inner focus:outline-none focus:ring-2 focus:ring-black/20"
              placeholder='e.g. "Tomorrow: laundry, write report, book dentist"'
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-4 flex items-center gap-3">
              <button
                className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.3em] transition hover:border-black/60 hover:bg-black hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 disabled:opacity-50"
                onClick={generatePlan}
                disabled={loading || !text.trim()}
                title={!text.trim() ? "Add a plan first" : "Generate plan"}
              >
                {loading ? "Planning..." : "Generate plan"}
              </button>
              {msg && <div className="text-xs text-black/60">{msg}</div>}
            </div>

            {plan && (
              <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4 space-y-2">
                <div className="text-xs uppercase tracking-[0.3em] text-black/60">Preview</div>
                {draftTasks.length === 0 && (
                  <div className="text-xs text-black/50">No tasks selected.</div>
                )}
                {draftTasks.map((t, i) => (
                  <div
                    key={`${t.title}-${i}`}
                    className="flex items-center gap-3 rounded-xl border border-black/5 bg-white/60 px-3 py-2 text-xs"
                  >
                    <input
                      className="flex-1 bg-transparent outline-none focus:ring-2 focus:ring-black/20 rounded-md px-1"
                      value={t.title}
                      onChange={(e) => {
                        const next = [...draftTasks];
                        next[i] = { ...next[i], title: e.target.value };
                        setDraftTasks(next);
                      }}
                      aria-label="Edit task title"
                    />
                    <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">
                      {t.date} {t.start_time}
                    </div>
                    <button
                      className="rounded-full border border-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-black/60 transition hover:border-black/60 hover:bg-black hover:text-white"
                      onClick={() => {
                        const next = draftTasks.filter((_, idx) => idx !== i);
                        setDraftTasks(next);
                      }}
                      aria-label="Delete task"
                      title="Delete task"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  className="mt-2 rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.3em] transition hover:border-black/60 hover:bg-black hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 disabled:opacity-50"
                  onClick={confirmAndCreate}
                  disabled={!session || creating || draftTasks.length === 0}
                  title={!session ? "Sign in to create Google Calendar events" : ""}
                >
                  {creating ? "Creating..." : "Add to Google Calendar"}
                </button>

                {!session && (
                  <div className="text-[10px] uppercase tracking-[0.3em] text-black/40">
                    Sign in to create events
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="fixed bottom-6 inset-x-0 flex justify-center z-20 pointer-events-auto">
        <div className="rounded-full bg-white/90 border border-black/10 shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur px-1 py-1 flex items-center gap-1">
          <Link
            className="px-4 py-1.5 text-sm rounded-full text-black/70 transition hover:bg-black/5 hover:text-black"
            href="/usage"
          >
            All
          </Link>
          <Link className="px-4 py-1.5 text-sm rounded-full bg-black text-white transition hover:bg-black/90" href="/">
            Day
          </Link>
        </div>
      </div>
    </main>
  );
}
