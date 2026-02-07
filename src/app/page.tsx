"use client";

import { useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  CalendarDaysIcon,
  CalendarIcon,
  UserCircleIcon,
  XMarkIcon,
  ArrowPathIcon, // Added for loading spinner
} from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { useUsageStore } from "@/lib/usage-store";
import BottomBar from "@/components/bottomBar";
import PageHeader from "@/components/pageHeader";
import WeekBar from "@/components/weekBar";

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
  const { usageMap, markUsed } = useUsageStore();

  const today = useMemo(() => new Date(), []);
  const todayLabel = useMemo(() => {
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  }, [today]);

  async function generatePlan() {
    if (!session) {
      setMsg("Sign in to generate a plan");
      return;
    }
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
    await markUsed();
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

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-10 pb-36 flex min-h-screen flex-col">
        <PageHeader
          eyebrow="Day planner"
          title={todayLabel}
          icon={<CalendarDaysIcon className="size-6 text-secondary" />}
          right={
            <button
              className="h-9 w-9 rounded-full border border-black/20 flex items-center justify-center text-black/70 transition hover:border-black/60 hover:bg-black hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 overflow-hidden"
              onClick={() => (session ? signOut() : signIn("google"))}
              aria-label={session ? "Sign out" : "Sign in"}
              title={session ? "Sign out" : "Sign in"}
            >
              {/* UPDATED: Show Profile Image if logged in, else generic icon */}
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircleIcon className="h-5 w-5" />
              )}
            </button>
          }
        />

        <WeekBar
          statusMap={usageMap}
          usedClassName="h-3 w-3 rounded-full bg-secondary"
          pastClassName="h-0.5 w-3 rounded-full bg-secondary/40"
        />

        <section className="mt-14 flex flex-col items-center text-center text-black/70">
          <div className="text-lg tracking-[0.2em] uppercase">
            Plan your day today
          </div>
        </section>

        <section className="flex-1 flex items-center">
          <div className="w-full max-w-3xl mx-auto rounded-3xl border border-black/10 bg-white/70 backdrop-blur px-6 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
            <div className="text-xs uppercase tracking-[0.35em] text-black/50">
              Add your tasks
            </div>
            <textarea
              className="mt-3 w-full rounded-2xl border border-black/10 bg-white/80 p-4 text-sm leading-relaxed shadow-inner focus:outline-none focus:ring-2 focus:ring-black/20"
              placeholder='e.g. "Tomorrow: laundry, write report, book dentist"'
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-4 flex items-center gap-3">
              <button
                className="h-9 w-9 rounded-full border border-orange-300 flex items-center justify-center text-orange-500 transition hover:border-orange-400 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 disabled:opacity-50"
                onClick={generatePlan}
                disabled={loading || !text.trim()}
                title={!text.trim() ? "Add a plan first" : "Generate plan"}
                aria-label="Generate plan"
              >
                {/* UPDATED: Loading Animation State */}
                {loading ? (
                  <ArrowPathIcon className="size-4 animate-spin" />
                ) : (
                  <SparklesIcon className="size-4" />
                )}
              </button>
              {msg && <div className="text-xs text-black/60">{msg}</div>}
            </div>

            {plan && (
              <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4 space-y-2">
                <div className="text-xs uppercase tracking-[0.3em] text-black/60">
                  Preview
                </div>
                {draftTasks.length === 0 && (
                  <div className="text-xs text-black/50">
                    No tasks selected.
                  </div>
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
                      {t.date} {t.start_time} · {t.duration_minutes}m
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
                      <XMarkIcon className="size-4" />
                    </button>
                  </div>
                ))}

                <button
                  className="mt-2 h-9 w-9 rounded-full border border-orange-300 flex items-center justify-center text-orange-500 transition hover:border-orange-400 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 disabled:opacity-50"
                  onClick={confirmAndCreate}
                  disabled={!session || creating || draftTasks.length === 0}
                  title={
                    !session ? "Sign in to create Google Calendar events" : ""
                  }
                  aria-label="Add to Google Calendar"
                >
                  {/* Optional: Add spinner here for creation too if desired */}
                  {creating ? (
                    <ArrowPathIcon className="size-4 animate-spin" />
                  ) : (
                    <CalendarIcon className="size-4" />
                  )}
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

      <BottomBar active="day" />
    </main>
  );
}