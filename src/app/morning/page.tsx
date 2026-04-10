"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sun,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Play,
  CheckCircle2,
  Clock
} from "lucide-react";
import {
  useRoutineActions,
  useActionRecords,
  useRoutineCompletions,
  useAddAction,
  useUpdateAction,
  useDeleteAction,
  useReorderActions,
  useToggleActionCompletion,
  useMarkDayComplete,
  type RoutineAction,
  type RoutineActionRecord,
} from "@/lib/api/routine";
import BottomBar from "@/components/bottomBar";
import PageHeader from "@/components/pageHeader";
import { toISODate } from "@/lib/utils";
import WeekBar from "@/components/weekBar";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

const HOLD_DURATION_MS = 1500;
const DEBOUNCE_MS = 400;
const SVG_CIRCUMFERENCE = 2 * Math.PI * 45;
const EMPTY_ACTIONS: RoutineAction[] = [];
const EMPTY_RECORDS: Record<string, RoutineActionRecord> = {};
const EMPTY_COMPLETIONS: Record<string, boolean> = {};

function DebouncedActionInput({
  action,
  onUpdate,
}: {
  action: { id: string; title: string; position: number };
  onUpdate: (a: { id: string; title: string; position: number }) => void;
}) {
  const [local, setLocal] = useState(action.title);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(action.title);
  }, [action.title]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocal(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onUpdate({ ...action, title: value });
      }, DEBOUNCE_MS);
    },
    [action, onUpdate]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <Input
      className="flex-1 h-8 border-none bg-transparent text-sm focus-visible:ring-0 px-1"
      value={local}
      onChange={handleChange}
    />
  );
}

export default function MorningRoutinePage() {
  const [titleInput, setTitleInput] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const today = useMemo(() => toISODate(new Date()), []);

  // Queries
  const { data: actions = EMPTY_ACTIONS, isLoading: loading } = useRoutineActions();
  const { data: actionRecords = EMPTY_RECORDS } = useActionRecords(today);
  const { data: completionMap = EMPTY_COMPLETIONS } = useRoutineCompletions();

  // Mutations
  const addActionMut = useAddAction();
  const updateActionMut = useUpdateAction();
  const deleteActionMut = useDeleteAction();
  const reorderActionsMut = useReorderActions();
  const toggleCompletionMut = useToggleActionCompletion();
  const markDayCompleteMut = useMarkDayComplete();

  const handleUpdateAction = useCallback(
    (a: RoutineAction) => updateActionMut.mutate(a),
    [updateActionMut]
  );

  // UI state — local, not server state. Initialized from sessionStorage.
  const [runnerOpen, setRunnerOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("morning-routine-ui-runner") === "true";
    } catch {
      return false;
    }
  });
  const [managerOpen, setManagerOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("morning-routine-ui-manager") === "true";
    } catch {
      return false;
    }
  });

  // Persist UI state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("morning-routine-ui-runner", String(runnerOpen));
    } catch { /* ignore */ }
  }, [runnerOpen]);

  useEffect(() => {
    try {
      sessionStorage.setItem("morning-routine-ui-manager", String(managerOpen));
    } catch { /* ignore */ }
  }, [managerOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("runner") === "open") {
      setRunnerOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (runnerOpen) {
      url.searchParams.set("runner", "open");
    } else {
      url.searchParams.delete("runner");
    }
    window.history.replaceState(null, "", url.pathname + (url.search || ""));
  }, [runnerOpen]);

  const completedToday = completionMap[today] || false;

  const currentActionId = useMemo(() => {
    const firstIncomplete = actions.find((action) => !actionRecords[action.id]?.completed);
    return firstIncomplete?.id ?? actions[0]?.id ?? null;
  }, [actions, actionRecords]);

  const currentIndex = useMemo(
    () => actions.findIndex((action) => action.id === currentActionId),
    [actions, currentActionId]
  );

  const currentAction = currentIndex >= 0 ? actions[currentIndex] : null;

  const upcomingActions = useMemo(() => {
    if (!currentAction) return [];
    return actions.slice(currentIndex + 1, currentIndex + 2);
  }, [actions, currentAction, currentIndex]);

  useEffect(() => {
    if (!runnerOpen) return;

    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [runnerOpen]);

  const handleAddAction = async () => {
    if (!titleInput.trim()) return;
    await addActionMut.mutateAsync({ title: titleInput, id: crypto.randomUUID() });
    setTitleInput("");
  };

  const handleMoveAction = async (index: number, direction: number) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= actions.length) return;
    await reorderActionsMut.mutateAsync({ startIndex: index, endIndex: targetIndex });
  };

  const handleMoveToNext = useCallback(async () => {
    if (!currentAction) return;
    await toggleCompletionMut.mutateAsync({ actionId: currentAction.id, recordId: crypto.randomUUID() });
    if (currentIndex >= actions.length - 1) {
      await markDayCompleteMut.mutateAsync(new Date());
      setRunnerOpen(false);
    }
  }, [currentAction, currentIndex, actions.length, toggleCompletionMut, markDayCompleteMut]);

  const handleMoveToNextRef = useRef(handleMoveToNext);
  useEffect(() => {
    handleMoveToNextRef.current = handleMoveToNext;
  }, [handleMoveToNext]);

  const cancelHold = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    holdStartRef.current = null;
    setHoldProgress(0);
  }, []);

  const handleHoldStart = useCallback(() => {
    if (actions.length === 0 || !currentAction) return;

    holdStartRef.current = Date.now();

    const tick = () => {
      const start = holdStartRef.current;
      if (start === null) return;

      const elapsed = Date.now() - start;
      const progress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        holdStartRef.current = null;
        rafRef.current = null;
        setHoldProgress(0);
        handleMoveToNextRef.current();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [actions.length, currentAction]);

  useEffect(() => {
    if (!runnerOpen) {
      cancelHold();
    }
  }, [runnerOpen, cancelHold]);

  useEffect(() => {
    return () => cancelHold();
  }, [cancelHold]);

  return (
    <main className="min-h-screen bg-white bg-dots text-black">
      <div className="max-w-2xl mx-auto px-6 pt-16 pb-32">
        <PageHeader
          eyebrow="Morning routine"
          title="Flow, focus, finish"
          icon={<Sun className="size-5 text-secondary" />}
          right={
            <Badge variant="outline" className="text-[10px] uppercase tracking-[0.15em] border-black/8 text-black/35 font-medium">
              {actions.length} actions
            </Badge>
          }
        />

        <div className="mt-8">
          <WeekBar
            statusMap={completionMap}
            usedClassName="h-3 w-3 rounded-full bg-secondary"
            pastClassName="h-0.5 w-3 rounded-full bg-secondary/20"
          />
        </div>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Routine Manager */}
          <Card className="border-black/6 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Routine</CardTitle>
                <CardDescription className="text-xs">Your daily steps</CardDescription>
              </div>
              <Button
                variant={managerOpen ? "default" : "outline"}
                size="sm"
                className={managerOpen ? "bg-black text-white h-8 text-xs" : "border-black/10 h-8 text-xs"}
                onClick={() => setManagerOpen(!managerOpen)}
              >
                {managerOpen ? (
                  <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Done</>
                ) : (
                  <><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[380px] pr-3">
                <div className="space-y-1.5">
                  {actions.map((action, index) => (
                    <div
                      key={action.id}
                      className="group flex items-center gap-2.5 rounded-lg border border-black/4 p-2.5 hover:bg-black/[0.02] transition-colors"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 px-2 text-[10px] uppercase tracking-wider rounded-full transition-colors ${
                          actionRecords[action.id]?.completed
                            ? "bg-black text-white"
                            : "bg-black/[0.04] text-black/35 hover:bg-black hover:text-white"
                        }`}
                        onClick={() => toggleCompletionMut.mutate({ actionId: action.id, recordId: crypto.randomUUID() })}
                      >
                        {actionRecords[action.id]?.completed ? "Done" : "Mark"}
                      </Button>

                      <DebouncedActionInput
                        action={action}
                        onUpdate={handleUpdateAction}
                      />

                      <div className="flex items-center gap-0.5">
                        {managerOpen && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full text-black/20 hover:text-black"
                              onClick={() => handleMoveAction(index, -1)}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full text-black/20 hover:text-black"
                              onClick={() => handleMoveAction(index, 1)}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full text-black/20 hover:text-destructive"
                              onClick={() => deleteActionMut.mutate(action.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        <span className="text-[10px] font-medium text-black/15 tabular-nums ml-1">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  ))}

                  {actions.length === 0 && !loading && (
                    <p className="py-10 text-center text-xs text-black/30">
                      Add your first action to begin.
                    </p>
                  )}
                </div>
              </ScrollArea>

              {managerOpen && (
                <div className="mt-4 pt-4 border-t border-black/6">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. Morning meditation"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddAction()}
                      className="rounded-full border-black/8 bg-black/[0.02] text-sm"
                    />
                    <Button
                      size="icon"
                      className="rounded-full bg-black text-white h-9 w-9 shrink-0"
                      onClick={handleAddAction}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right column */}
          <div className="space-y-6">
            {/* Start / Completed */}
            <Card className="border-black/6 shadow-none">
              <CardContent className="p-5 text-center">
                {completedToday ? (
                  <div className="py-6 space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-secondary mx-auto" />
                    <p className="text-sm font-semibold">Completed</p>
                    <p className="text-[11px] text-black/35">Great start to your day</p>
                  </div>
                ) : (
                  <div className="py-4">
                    <Button
                      size="lg"
                      className="w-full h-14 rounded-2xl bg-black hover:bg-black/85 text-white text-sm font-medium"
                      onClick={() => setRunnerOpen(true)}
                      disabled={actions.length === 0}
                    >
                      <Play className="mr-2 h-4 w-4 fill-current" />
                      Start Routine
                    </Button>
                    {actions.length === 0 && !loading && (
                      <p className="mt-3 text-[11px] text-black/30">Add actions to enable start</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status */}
            <Card className="border-black/6 shadow-none">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-black/30 font-medium">
                  <Clock className="h-3 w-3" /> Status
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-black/45">Actions</span>
                  <span className="text-xs font-medium">{actions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-black/45">Completion</span>
                  <span className="text-xs font-medium">
                    {actions.length > 0
                      ? Math.round((actions.filter(a => actionRecords[a.id]?.completed).length / actions.length) * 100)
                      : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      <BottomBar active="morning" />

      {/* Runner Dialog */}
      <Dialog open={runnerOpen} onOpenChange={setRunnerOpen}>
        <DialogContent className="max-w-lg w-full h-full sm:h-auto flex flex-col p-0 overflow-hidden border-black/6 bg-white shadow-lg sm:rounded-2xl">
          <div className="flex-1 flex flex-col p-6 sm:p-8">
            <DialogHeader className="flex flex-row items-center justify-between mb-8">
              <DialogTitle className="text-[11px] uppercase tracking-[0.3em] text-black/30 font-medium">
                Morning Runner
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-black/5"
                onClick={() => setRunnerOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <div className="flex-1 flex flex-col space-y-8">
              <div className="space-y-3 text-center">
                <p className="text-[11px] font-medium text-black/30">
                  Step {currentIndex + 1} of {actions.length}
                </p>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                  {currentAction ? currentAction.title : "All Completed"}
                </h2>
                <div className="text-3xl font-light tracking-tight tabular-nums text-black/20">
                  {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Up Next */}
                <div className="rounded-xl border border-black/4 p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-black/30 font-medium mb-3">Up Next</p>
                  {upcomingActions.length > 0 ? (
                    upcomingActions.map((action) => (
                      <div key={action.id} className="flex items-center justify-between">
                        <span className="text-sm text-black/60 truncate mr-2">{action.title}</span>
                        <span className="text-[10px] text-black/20 shrink-0">Step {currentIndex + 2}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-black/25">Last step</p>
                  )}
                </div>

                {/* Hold to proceed */}
                <div className="rounded-xl border border-black/4 p-4 flex flex-col items-center justify-center gap-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-black/30 font-medium">Hold to proceed</p>
                  <div className="relative h-16 w-16">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50" cy="50" r="45"
                        fill="none" stroke="currentColor" strokeWidth="6"
                        className="text-black/[0.04]"
                      />
                      <circle
                        cx="50" cy="50" r="45"
                        fill="none" stroke="currentColor" strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={SVG_CIRCUMFERENCE}
                        strokeDashoffset={SVG_CIRCUMFERENCE * (1 - holdProgress / 100)}
                        className="text-secondary transition-none"
                      />
                    </svg>
                    <div
                      className={`absolute inset-1.5 rounded-full bg-white border border-black/6 flex items-center justify-center select-none touch-none ${
                        actions.length === 0 || !currentAction
                          ? "opacity-30 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                      onPointerDown={actions.length === 0 || !currentAction ? undefined : handleHoldStart}
                      onPointerUp={cancelHold}
                      onPointerLeave={cancelHold}
                      onPointerCancel={cancelHold}
                    >
                      <CheckCircle2 className={`h-5 w-5 transition-colors ${holdProgress > 0 ? 'text-secondary' : 'text-black/15'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Progress value={((currentIndex + 1) / actions.length) * 100} className="h-1.5 bg-black/[0.04]" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
