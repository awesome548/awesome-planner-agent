"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarDays,
  Sparkles,
  Calendar,
  Trash2,
  Loader2,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { useUsageRecords, useMarkUsed } from "@/lib/api/usage";
import { useCalendars, usePreparePlan, useGeneratePlan, useCreateEvents, type Task } from "@/lib/api/plan";
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

const EMPTY_USAGE_MAP: Record<string, boolean> = {};
const EMPTY_CALENDARS: Array<{ id: string; summary: string; primary?: boolean }> = [];

export default function PlanPage() {
  const { data: session } = useSession();
  const [text, setText] = useState("");

  const [plan, setPlan] = useState<{ tasks: Task[] } | null>(null);
  const [draftTasks, setDraftTasks] = useState<Task[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [synced, setSynced] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("primary");

  const { data: usageMap = EMPTY_USAGE_MAP } = useUsageRecords();
  const markUsed = useMarkUsed();

  const { data: calendars = EMPTY_CALENDARS, isLoading: calendarsLoading } = useCalendars();

  const preparePlan = usePreparePlan();
  const generatePlanMut = useGeneratePlan();
  const createEvents = useCreateEvents();

  const loading = preparePlan.isPending || generatePlanMut.isPending;
  const creating = createEvents.isPending;

  // Persist input text across tab switches; cleared after calendar sync
  useEffect(() => {
    const saved = localStorage.getItem("planner-input-text");
    if (saved) setText(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("planner-input-text", text);
  }, [text]);

  useEffect(() => {
    if (calendars.length === 0) return;
    const primary = calendars.find((c: { primary?: boolean }) => c.primary);
    if (primary) setSelectedCalendarId(primary.id);
  }, [calendars]);

  const today = useMemo(() => new Date(), []);
  const todayLabel = useMemo(() => {
    return today.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replace(/\//g, ".");
  }, [today]);

  async function handleGeneratePlan() {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setMsg("");
    setPlan(null);
    setSynced(false);

    try {
      setMsg("Fetching calendar events...");
      const prepareData = await preparePlan.mutateAsync({ timeZone, calendarId: selectedCalendarId });

      setMsg("Generating plan...");
      const generateData = await generatePlanMut.mutateAsync({
        text,
        timeZone,
        today: prepareData.today,
        nowLocal: prepareData.nowLocal,
        busySummary: prepareData.busySummary,
        busyIntervalsIso: prepareData.busyIntervalsIso,
        notionRules: prepareData.notionRules,
      });

      setPlan(generateData.plan);
      setDraftTasks(generateData.plan?.tasks ?? []);
      setMsg(generateData.warning || "Plan generated. Review and create events.");
      markUsed.mutate(new Date());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Network error. Please try again.");
    }
  }

  async function handleConfirmAndCreate() {
    if (!plan) return;
    setMsg("");

    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const data = await createEvents.mutateAsync({
        plan: { tasks: draftTasks },
        timeZone,
        calendarId: selectedCalendarId,
      });

      const selectedLabel = calendars.find((c) => c.id === selectedCalendarId)?.summary ?? selectedCalendarId;
      const createdMessage = `Created ${data.createdCount} events in "${selectedLabel}"`;
      setMsg(data.warning ? `${createdMessage}. ${data.warning}` : createdMessage);
      setText("");
      localStorage.removeItem("planner-input-text");
      setSynced(true);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Network error. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-white bg-dots text-black">
      <div className="max-w-2xl mx-auto px-6 pt-16 pb-32 flex min-h-screen flex-col">
        <PageHeader
          eyebrow="Day planner"
          title={todayLabel}
          icon={<CalendarDays className="size-5 text-primary" />}
        />

        <div className="mt-8">
          <WeekBar
            statusMap={usageMap}
            usedClassName="h-3 w-3 rounded-full bg-primary"
            pastClassName="h-0.5 w-3 rounded-full bg-primary/20"
          />
        </div>

        <section className="mt-12 flex-1">
          <Card className="border-black/6 shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Daily Input</CardTitle>
                  <CardDescription className="text-xs">What needs to happen today?</CardDescription>
                </div>
                {session && (
                  <Select
                    value={selectedCalendarId}
                    onValueChange={setSelectedCalendarId}
                    disabled={calendarsLoading || calendars.length === 0}
                  >
                    <SelectTrigger className="h-8 w-[160px] text-[11px] border-black/8 bg-white">
                      <SelectValue placeholder="Calendar" />
                    </SelectTrigger>
                    <SelectContent>
                      {calendars.length === 0 ? (
                        <SelectItem value="primary">Primary</SelectItem>
                      ) : (
                        calendars.map((cal) => (
                          <SelectItem key={cal.id} value={cal.id}>
                            {cal.summary}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                className="min-h-[100px] resize-none border-black/6 bg-black/[0.02] text-sm placeholder:text-black/25 focus-visible:ring-1 focus-visible:ring-black/10"
                placeholder='e.g. "Laundry at 10am, 2h focus work on report, book dentist"'
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGeneratePlan}
                  disabled={loading || !text.trim()}
                  className="rounded-full bg-black hover:bg-black/80 text-white text-xs px-5 h-9"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                  )}
                  Generate
                </Button>
                {msg && <p className="text-[11px] text-black/40 font-medium">{msg}</p>}
              </div>

              {plan && (
                <div className="pt-6 space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-black/30">
                      {synced ? "Synced" : "Preview"}
                    </p>
                    {synced && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {draftTasks.length === 0 && (
                      <p className="py-6 text-center text-xs text-black/30">No tasks generated.</p>
                    )}
                    {draftTasks.map((t, i) => (
                      <div
                        key={`${t.title}-${i}`}
                        className={`group flex items-center gap-3 rounded-lg border border-black/4 p-3 transition-colors ${synced ? "opacity-70" : "hover:bg-black/[0.02]"}`}
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          {synced ? (
                            <p className="text-sm font-medium">{t.title}</p>
                          ) : (
                            <input
                              className="w-full bg-transparent text-sm font-medium outline-none"
                              value={t.title}
                              onChange={(e) => {
                                const next = [...draftTasks];
                                next[i] = { ...next[i], title: e.target.value };
                                setDraftTasks(next);
                              }}
                            />
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-black/30">
                            <span>{t.start_time}</span>
                            <span>·</span>
                            <span>{t.duration_minutes}m</span>
                          </div>
                        </div>
                        {!synced && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 text-black/20 hover:text-black transition-all"
                            onClick={() => setDraftTasks(draftTasks.filter((_, idx) => idx !== i))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    {synced ? (
                      <Button
                        onClick={() => {
                          setPlan(null);
                          setDraftTasks([]);
                          setSynced(false);
                          setMsg("");
                        }}
                        className="rounded-full border-black/10 text-xs px-5 h-9"
                        variant="outline"
                      >
                        <RotateCcw className="mr-2 h-3.5 w-3.5" />
                        New Plan
                      </Button>
                    ) : (
                      <>
                        {!session && (
                          <p className="text-[11px] text-black/30">Sign in to sync</p>
                        )}
                        <Button
                          onClick={handleConfirmAndCreate}
                          disabled={!session || creating || draftTasks.length === 0}
                          className="rounded-full bg-black hover:bg-black/80 text-white text-xs px-5 h-9 ml-auto"
                        >
                          {creating ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Calendar className="mr-2 h-3.5 w-3.5" />
                          )}
                          Sync to Calendar
                        </Button>
                      </>
                    )}
                  </div>
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
