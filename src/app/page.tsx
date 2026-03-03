"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { 
  Sparkles, 
  Calendar, 
  Trash2, 
  Loader2,
} from "lucide-react";
import { useUsageStore } from "@/lib/usage-store";
import BottomBar from "@/components/bottomBar";
import PageHeader from "@/components/pageHeader";
import WeekBar from "@/components/weekBar";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Task = {
  title: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  duration_minutes: number;
  difficulty: "simple" | "normal" | "deep";
  notes?: string;
};

type UserCalendar = {
  id: string;
  summary: string;
  primary?: boolean;
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

  const [calendars, setCalendars] = useState<UserCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("primary");
  const [calendarsLoading, setCalendarsLoading] = useState(false);

  // Persist input text across tab switches; cleared after calendar sync
  useEffect(() => {
    const saved = localStorage.getItem("planner-input-text");
    if (saved) setText(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("planner-input-text", text);
  }, [text]);

  const today = useMemo(() => new Date(), []);
  const todayLabel = useMemo(() => {
    return today.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replace(/\//g, ".");
  }, [today]);

  useEffect(() => {
    if (!session) return;
    setCalendarsLoading(true);
    fetch("/api/calendar/calendars")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.calendars)) {
          setCalendars(data.calendars);
          const primary = data.calendars.find((c: UserCalendar) => c.primary);
          if (primary) setSelectedCalendarId(primary.id);
        }
      })
      .catch(() => {
        // silently fall back to "primary"
      })
      .finally(() => setCalendarsLoading(false));
  }, [session]);

  async function generatePlan() {
    if (!session) {
      setMsg("Sign in to generate a plan");
      return;
    }
    setLoading(true);
    setMsg("");
    setPlan(null);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Phase 1: fetch calendar events + Notion rules (fast, ~1–3s)
      setMsg("Fetching calendar events…");
      const prepareRes = await fetch("/api/plan/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeZone, calendarId: selectedCalendarId }),
      });
      const prepareData = await prepareRes.json();
      if (!prepareRes.ok || !prepareData?.ok) {
        setMsg(prepareData?.error || "Failed to fetch schedule");
        return;
      }

      // Phase 2: generate plan with OpenAI (slow, ~10–30s)
      // Regular fetch resolves at the network layer — safe across tab switches.
      setMsg("Generating plan…");
      const generateRes = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          timeZone,
          today: prepareData.today,
          nowLocal: prepareData.nowLocal,
          busySummary: prepareData.busySummary,
          busyIntervalsIso: prepareData.busyIntervalsIso,
          notionRules: prepareData.notionRules,
        }),
      });
      const generateData = await generateRes.json();
      if (!generateRes.ok || !generateData?.ok) {
        setMsg(generateData?.error || "Failed to generate plan");
        return;
      }

      setPlan(generateData.plan);
      setDraftTasks(generateData.plan?.tasks ?? []);
      setMsg(generateData.warning || "Plan generated. Review and create events.");
      await markUsed();
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmAndCreate() {
    if (!plan) return;
    setCreating(true);
    setMsg("");
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/calendar/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: { tasks: draftTasks },
          timeZone,
          calendarId: selectedCalendarId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setMsg(data?.error || "Failed to create events");
        return;
      }

      const selectedLabel =
        calendars.find((c) => c.id === selectedCalendarId)?.summary ?? selectedCalendarId;
      const createdMessage = `Created ${data.createdCount} events in "${selectedLabel}"`;
      setMsg(data?.warning ? `${createdMessage}. ${data.warning}` : createdMessage);
      setText("");
      localStorage.removeItem("planner-input-text");
      setPlan(null);
      setDraftTasks([]);
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  const selectedCalendarLabel = useMemo(() => {
    if (calendarsLoading) return "Loading…";
    if (calendars.length === 0) return "Primary calendar";
    return (
      calendars.find((c) => c.id === selectedCalendarId)?.summary ?? "Primary calendar"
    );
  }, [calendars, selectedCalendarId, calendarsLoading]);

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#f8f6f1] text-[#0c0c0c] selection:bg-primary/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f8f6f1_55%,_#f1efe8_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(#1a1a1a1a_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-10 pb-36 flex min-h-screen flex-col">
        <PageHeader
          eyebrow="Day planner"
          title={todayLabel}
          icon={<CalendarDaysIcon className="size-6 text-primary" />}
        />

        <WeekBar
          statusMap={usageMap}
          usedClassName="h-3 w-3 rounded-full bg-primary shadow-[0_0_8px_rgba(92,107,192,0.4)]"
          pastClassName="h-0.5 w-3 rounded-full bg-primary/30"
        />

        <section className="mt-14 mb-8 flex flex-col items-center text-center">
          <h2 className="text-sm font-medium tracking-[0.3em] uppercase text-black/40">
            Intelligent Scheduling
          </h2>
        </section>

        <section className="flex-1 w-full mx-auto">
          <Card className="border-black/5 bg-white/60 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold tracking-tight">Daily Input</CardTitle>
                  <CardDescription>What's on your mind today?</CardDescription>
                </div>
                {session && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedCalendarId}
                      onValueChange={setSelectedCalendarId}
                      disabled={calendarsLoading || calendars.length === 0}
                    >
                      <SelectTrigger className="h-8 w-[180px] text-[10px] uppercase tracking-wider bg-white/50 border-black/10">
                        <SelectValue placeholder="Select calendar" />
                      </SelectTrigger>
                      <SelectContent>
                        {calendars.length === 0 ? (
                          <SelectItem value="primary">Primary calendar</SelectItem>
                        ) : (
                          calendars.map((cal) => (
                            <SelectItem key={cal.id} value={cal.id}>
                              {cal.summary}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                className="min-h-[120px] resize-none border-black/5 bg-white/40 focus-visible:ring-primary/20 focus-visible:border-primary/30 text-base placeholder:text-black/20"
                placeholder='e.g. "Laundry at 10am, 2h focus work on report, book dentist"'
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={generatePlan}
                    disabled={loading || !text.trim()}
                    className="rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 px-6"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate Plan
                  </Button>
                  {msg && <p className="text-xs text-black/50 font-medium italic">{msg}</p>}
                </div>
              </div>

              {plan && (
                <div className="pt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-2 mb-4">
                    <Separator className="flex-1 bg-black/5" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-black/30 font-bold">Preview Plan</span>
                    <Separator className="flex-1 bg-black/5" />
                  </div>
                  
                  <div className="space-y-2">
                    {draftTasks.length === 0 && (
                      <div className="py-8 text-center text-sm text-black/30 italic">
                        No tasks generated.
                      </div>
                    )}
                    {draftTasks.map((t, i) => (
                      <div
                        key={`${t.title}-${i}`}
                        className="group flex items-center gap-3 rounded-2xl border border-black/[0.03] bg-white/40 p-3 transition-all hover:bg-white/80 hover:shadow-sm"
                      >
                        <div className="flex-1 space-y-1">
                          <input
                            className="w-full bg-transparent font-medium text-sm outline-none focus:ring-1 focus:ring-primary/20 rounded px-1 transition-all"
                            value={t.title}
                            onChange={(e) => {
                              const next = [...draftTasks];
                              next[i] = { ...next[i], title: e.target.value };
                              setDraftTasks(next);
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-black/5 text-[9px] uppercase tracking-tighter hover:bg-black/10 transition-colors">
                              {t.start_time}
                            </Badge>
                            <span className="text-[10px] text-black/30">•</span>
                            <span className="text-[10px] text-black/40 font-medium">{t.duration_minutes} min</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 text-black/20 hover:text-destructive hover:bg-destructive/5 transition-all"
                          onClick={() => {
                            const next = draftTasks.filter((_, idx) => idx !== i);
                            setDraftTasks(next);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-black/5 flex justify-end">
                    <Button
                      onClick={confirmAndCreate}
                      disabled={!session || creating || draftTasks.length === 0}
                      className="rounded-full bg-black text-white hover:bg-black/80 px-6"
                    >
                      {creating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Calendar className="mr-2 h-4 w-4" />
                      )}
                      Sync to Google Calendar
                    </Button>
                  </div>
                  
                  {!session && (
                    <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-black/40">
                      Sign in to enable calendar sync
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <BottomBar active="plan" />
    </main>
  );
}
