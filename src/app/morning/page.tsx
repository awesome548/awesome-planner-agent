"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SunIcon,
} from "@heroicons/react/24/outline";
import { 
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
import { useRoutineStore } from "@/lib/morning-routine-store";
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

export default function MorningRoutinePage() {
  const [titleInput, setTitleInput] = useState("");
  // Fix #2/#3 (issue #1): runnerOpen and managerOpen now live in the Zustand store
  // (persisted to sessionStorage) instead of local useState, so they survive React
  // remounts and mobile browser tab eviction.
  const [now, setNow] = useState(() => new Date());
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const {
    actions,
    actionRecords,
    completionMap,
    loading,
    runnerOpen,
    setRunnerOpen,
    managerOpen,
    setManagerOpen,
    addAction,
    updateAction,
    deleteAction,
    reorderActions,
    toggleActionCompletion,
    markDayComplete,
    refreshTodayRecords,
  } = useRoutineStore();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        await refreshTodayRecords();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refreshTodayRecords]);

  // Fix #4 (issue #1): On mount, restore runnerOpen from the URL (?runner=open).
  // This lets deep-links and hard-reloads reopen the runner without relying solely on
  // sessionStorage (which is cleared when the tab is closed).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("runner") === "open") {
      setRunnerOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount only

  // Fix #4 (issue #1): Mirror runnerOpen → URL so the state is bookmarkable and
  // survives hard-reloads. Uses replaceState to avoid polluting the history stack.
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

  const completedToday = completionMap[toISODate(new Date())] || false;

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
    await addAction(titleInput);
    setTitleInput("");
  };

  const handleMoveAction = async (index: number, direction: number) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= actions.length) return;
    await reorderActions(index, targetIndex);
  };

  const handleMoveToNext = useCallback(async () => {
    if (!currentAction) return;

    await toggleActionCompletion(currentAction.id);

    if (currentIndex >= actions.length - 1) {
      await markDayComplete();
      setRunnerOpen(false);
    }
  }, [currentAction, currentIndex, actions.length, toggleActionCompletion, markDayComplete]);

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
    <main className="min-h-screen relative overflow-hidden bg-[#f8f6f1] text-[#0c0c0c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f8f6f1_55%,_#f1efe8_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(#1a1a1a1a_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-10 pb-32">
        <PageHeader
          eyebrow="Morning routine"
          title="Flow, focus, finish strong"
          icon={<SunIcon className="size-6 text-secondary" />}
          right={
            <Badge variant="outline" className="text-[10px] uppercase tracking-[0.2em] border-black/10 text-black/40">
              {actions.length} actions
            </Badge>
          }
        />

        <WeekBar
          statusMap={completionMap}
          usedClassName="h-3 w-3 rounded-full bg-secondary shadow-[0_0_8px_rgba(38,166,154,0.4)]"
          pastClassName="h-0.5 w-3 rounded-full bg-secondary/30"
        />

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-black/5 bg-white/60 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight">Routine Manager</CardTitle>
                <CardDescription>Organize your steps</CardDescription>
              </div>
              <Button
                variant={managerOpen ? "default" : "outline"}
                size="sm"
                className={managerOpen ? "bg-black" : "border-black/10"}
                onClick={() => setManagerOpen(!managerOpen)}
              >
                {managerOpen ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Done
                  </>
                ) : (
                  <>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {actions.map((action, index) => (
                    <div
                      key={action.id}
                      className="group flex items-center gap-3 rounded-2xl border border-black/[0.03] bg-white/40 p-3 transition-all hover:bg-white/80"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 px-2 text-[10px] uppercase tracking-widest rounded-full transition-all ${
                          actionRecords[action.id]?.completed
                            ? "bg-black text-white hover:bg-black/80"
                            : "bg-black/5 text-black/40 hover:bg-black hover:text-white"
                        }`}
                        onClick={() => toggleActionCompletion(action.id)}
                      >
                        {actionRecords[action.id]?.completed ? "Done" : "Mark"}
                      </Button>
                      
                      <Input
                        className="flex-1 h-8 border-none bg-transparent font-medium text-sm focus-visible:ring-0 px-1"
                        value={action.title}
                        onChange={(e) => {
                          updateAction({ ...action, title: e.target.value });
                        }}
                      />

                      <div className="flex items-center gap-1">
                        {managerOpen && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full text-black/20 hover:text-black hover:bg-black/5"
                              onClick={() => handleMoveAction(index, -1)}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full text-black/20 hover:text-black hover:bg-black/5"
                              onClick={() => handleMoveAction(index, 1)}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full text-black/20 hover:text-destructive hover:bg-destructive/5"
                              onClick={() => deleteAction(action.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <span className="text-[10px] font-bold text-black/10 tracking-widest ml-1">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  ))}

                  {actions.length === 0 && !loading && (
                    <div className="py-12 text-center text-sm text-black/30 italic">
                      Add your first routine action to begin.
                    </div>
                  )}
                </div>
              </ScrollArea>

              {managerOpen && (
                <div className="mt-6 pt-6 border-t border-black/5">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. Morning meditation"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddAction()}
                      className="rounded-full border-black/10 bg-white/60"
                    />
                    <Button
                      size="icon"
                      className="rounded-full bg-black text-white shadow-lg"
                      onClick={handleAddAction}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-8">
            <Card className="border-black/5 bg-white/60 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight">Time Control</CardTitle>
                <CardDescription>Ready to start?</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                {completedToday ? (
                  <div className="py-8 space-y-3">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-secondary" />
                      </div>
                    </div>
                    <p className="text-lg font-semibold tracking-tight">Morning Completed</p>
                    <p className="text-xs text-black/40 uppercase tracking-widest font-bold">Excellent start to your day</p>
                  </div>
                ) : (
                  <div className="py-6 space-y-4">
                    <Button
                      size="lg"
                      className="w-full h-20 rounded-3xl bg-secondary hover:bg-secondary/90 text-white shadow-xl shadow-secondary/20 transition-all active:scale-[0.98] text-lg font-semibold tracking-wide"
                      onClick={() => setRunnerOpen(true)}
                      disabled={actions.length === 0}
                    >
                      <Play className="mr-3 h-6 w-6 fill-current" />
                      Start Routine
                    </Button>
                    {actions.length === 0 && !loading && (
                      <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] font-bold">
                        Add actions to enable start
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-black/5 bg-white/60 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] font-bold text-black/30 mb-2">
                  <Clock className="h-3 w-3" /> System Status
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-black/50">Actions Prepared</span>
                  <Badge variant="secondary" className="bg-black/5 text-black/60">{actions.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-black/50">Completion Rate</span>
                  <span className="text-xs font-bold text-black/70">
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

      <Dialog open={runnerOpen} onOpenChange={setRunnerOpen}>
        <DialogContent className="max-w-4xl w-full h-full sm:h-[90vh] flex flex-col p-0 overflow-hidden border-none bg-transparent shadow-none">
          <div className="flex-1 flex flex-col bg-[#f8f6f1]/95 backdrop-blur-2xl p-6 sm:p-8 rounded-none sm:rounded-[40px] sm:m-4 shadow-2xl border border-white/50">
            <DialogHeader className="flex flex-row items-center justify-between mb-6 sm:mb-12">
              <DialogTitle className="text-[10px] uppercase tracking-[0.4em] text-black/30 font-bold">
                Morning Runner
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/50 border border-black/5 hover:bg-white transition-all"
                onClick={() => setRunnerOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogHeader>

            <div className="flex-1 flex flex-col space-y-6 sm:space-y-12 overflow-y-auto">
              <div className="space-y-2 sm:space-y-4 text-center">
                <Badge variant="outline" className="px-3 py-0.5 text-[9px] uppercase tracking-[0.3em] border-secondary/20 text-secondary bg-secondary/10 font-bold">
                  Step {currentIndex + 1} of {actions.length}
                </Badge>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight px-2">
                  {currentAction ? currentAction.title : "All Completed"}
                </h2>
                <div className="text-4xl sm:text-6xl font-bold tracking-tight tabular-nums text-black/20">
                  {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                <Card className="border-black/5 bg-white/40 shadow-sm rounded-2xl sm:rounded-3xl overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-black/30 mb-2 sm:mb-4">Up Next</div>
                    <div className="space-y-2">
                      {upcomingActions.length > 0 ? (
                        upcomingActions.map((action) => (
                          <div key={action.id} className="flex items-center justify-between py-1">
                            <span className="font-medium text-sm sm:text-base text-black/70 truncate mr-2">{action.title}</span>
                            <Badge variant="outline" className="text-[8px] sm:text-[9px] text-black/20 font-bold border-none shrink-0">STEP {currentIndex + 2}</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs sm:text-sm italic text-black/30">Finish line ahead</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-black/5 bg-white/40 shadow-sm rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col justify-center">
                  <CardContent className="p-4 sm:p-8 text-center space-y-3 sm:space-y-4">
                    <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-black/30">Hold to proceed</div>
                    <div className="relative h-20 w-20 sm:h-24 sm:w-24 mx-auto">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-black/5"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 45}
                          strokeDashoffset={2 * Math.PI * 45 * (1 - holdProgress / 100)}
                          className="text-secondary"
                        />
                      </svg>
                      <div
                        className={`absolute inset-2 rounded-full bg-white shadow-lg flex items-center justify-center select-none touch-none ${
                          actions.length === 0 || !currentAction
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                        onPointerDown={actions.length === 0 || !currentAction ? undefined : handleHoldStart}
                        onPointerUp={cancelHold}
                        onPointerLeave={cancelHold}
                        onPointerCancel={cancelHold}
                      >
                        <CheckCircle2 className={`h-6 w-6 sm:h-8 sm:w-8 transition-colors ${holdProgress > 0 ? 'text-secondary' : 'text-black/20'}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mt-6 sm:mt-8">
              <Progress value={((currentIndex + 1) / actions.length) * 100} className="h-3 bg-black/5" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
