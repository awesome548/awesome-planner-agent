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
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const HOLD_DURATION_MS = 2000;

export default function MorningRoutinePage() {
  const [titleInput, setTitleInput] = useState("");
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const {
    actions,
    actionRecords,
    completionMap,
    loading,
    addAction,
    updateAction,
    deleteAction,
    reorderActions,
    toggleActionCompletion,
    markDayComplete,
    refreshTodayRecords,
  } = useRoutineStore();

  const DEFAULT_ACTION_SECONDS = 5 * 60;

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
    return actions.slice(currentIndex + 1, currentIndex + 4);
  }, [actions, currentAction, currentIndex]);

  useEffect(() => {
    if (!runnerOpen) return;

    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [runnerOpen]);

  useEffect(() => {
    if (!runnerOpen || !currentAction) {
      setRemainingSeconds(null);
      return;
    }

    setRemainingSeconds(DEFAULT_ACTION_SECONDS);
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev === null ? null : Math.max(prev - 1, 0)));
    }, 1000);

    return () => clearInterval(interval);
  }, [runnerOpen, currentAction?.id]);

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

  const formatRemaining = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${secs}`;
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#f8f6f1] text-[#0c0c0c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f8f6f1_55%,_#f1efe8_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(#1a1a1a1a_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-10 pb-32">
        <PageHeader
          eyebrow="Morning routine"
          title="Flow, focus, finish strong"
          icon={<SunIcon className="size-6 text-sky-500" />}
          right={
            <Badge variant="outline" className="text-[10px] uppercase tracking-[0.2em] border-black/10 text-black/40">
              {actions.length} actions
            </Badge>
          }
        />

        <WeekBar
          statusMap={completionMap}
          usedClassName="h-3 w-3 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
          pastClassName="h-0.5 w-3 rounded-full bg-sky-400/30"
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
                onClick={() => setManagerOpen((prev) => !prev)}
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
                      <div className="h-16 w-16 rounded-full bg-sky-50 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-sky-500" />
                      </div>
                    </div>
                    <p className="text-lg font-semibold tracking-tight">Morning Completed</p>
                    <p className="text-xs text-black/40 uppercase tracking-widest font-bold">Excellent start to your day</p>
                  </div>
                ) : (
                  <div className="py-6 space-y-4">
                    <Button
                      size="lg"
                      className="w-full h-20 rounded-3xl bg-sky-400 hover:bg-sky-500 text-white shadow-xl shadow-sky-200 transition-all active:scale-[0.98] text-lg font-semibold tracking-wide"
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
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-none bg-transparent shadow-none">
          <div className="flex-1 flex flex-col bg-[#f8f6f1]/95 backdrop-blur-2xl p-8 rounded-[40px] m-4 shadow-2xl border border-white/50">
            <DialogHeader className="flex flex-row items-center justify-between mb-12">
              <div className="space-y-1">
                <DialogTitle className="text-xs uppercase tracking-[0.4em] text-black/30 font-bold">
                  Morning Runner
                </DialogTitle>
                <div className="text-2xl font-bold tracking-tight">
                  {now.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/50 border border-black/5 hover:bg-white transition-all"
                onClick={() => setRunnerOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogHeader>

            <div className="flex-1 flex flex-col space-y-12 overflow-y-auto pr-2">
              <div className="space-y-4 text-center">
                <Badge variant="outline" className="px-4 py-1 text-[10px] uppercase tracking-[0.3em] border-sky-200 text-sky-600 bg-sky-50 font-bold">
                  Current Task • {currentIndex + 1} of {actions.length}
                </Badge>
                <h2 className="text-5xl font-bold tracking-tight leading-tight px-4">
                  {currentAction ? currentAction.title : "All Completed"}
                </h2>
                <div className="flex items-center justify-center gap-2 text-2xl font-mono text-black/40">
                  <Clock className="h-6 w-6" /> {formatRemaining(remainingSeconds)}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-black/5 bg-white/40 shadow-sm rounded-3xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/30 mb-4">Up Next</div>
                    <div className="space-y-3">
                      {upcomingActions.length > 0 ? (
                        upcomingActions.map((action, idx) => (
                          <div key={action.id} className="flex items-center justify-between py-1">
                            <span className="font-medium text-black/70">{action.title}</span>
                            <Badge variant="outline" className="text-[9px] text-black/20 font-bold border-none">STEP {currentIndex + idx + 2}</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm italic text-black/30">Finish line ahead</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-black/5 bg-white/40 shadow-sm rounded-3xl overflow-hidden flex flex-col justify-center">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/30 mb-2">Hold to proceed</div>
                    <div className="relative h-24 w-24 mx-auto">
                      <svg className="h-full w-full -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="44"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-black/5"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="44"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          strokeDasharray={276}
                          strokeDashoffset={276 - (276 * holdProgress) / 100}
                          className="text-sky-400 transition-all duration-75"
                        />
                      </svg>
                      <Button
                        className="absolute inset-2 rounded-full bg-white shadow-lg border-none hover:bg-sky-50 transition-colors select-none touch-none"
                        onPointerDown={handleHoldStart}
                        onPointerUp={cancelHold}
                        onPointerLeave={cancelHold}
                        onPointerCancel={cancelHold}
                        disabled={actions.length === 0 || !currentAction}
                      >
                        <CheckCircle2 className={`h-8 w-8 transition-colors ${holdProgress > 0 ? 'text-sky-500' : 'text-black/20'}`} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mt-8">
              <Progress value={((currentIndex + 1) / actions.length) * 100} className="h-1 bg-black/5" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
