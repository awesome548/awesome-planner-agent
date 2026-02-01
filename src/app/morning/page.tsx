"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  SunIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PencilIcon } from "@heroicons/react/24/solid";
import { useRoutineStore } from "@/lib/morning-routine-store";
import BottomBar from "@/components/bottomBar";
import PageHeader from "@/components/pageHeader";
import { toISODate } from "@/lib/utils";
import WeekBar from "@/components/weekBar";

export default function MorningRoutinePage() {
  const [titleInput, setTitleInput] = useState("");
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

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

  // Refresh records when tab becomes visible
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

  // Computed values
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

  // Timer effects
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

  // Handlers
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

  const handleMoveToNext = async () => {
    if (!currentAction) return;

    await toggleActionCompletion(currentAction.id);

    if (currentIndex >= actions.length - 1) {
      await markDayComplete();
      setRunnerOpen(false);
    }
  };

  // Utilities
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
      <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(#1a1a1a1a_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-10 pb-32">
        <PageHeader
          eyebrow="Morning routine"
          title="Flow, focus, finish strong"
          icon={<SunIcon className="size-6" />}
          right={
            <div className="text-xs uppercase tracking-[0.3em] text-black/50">
              {actions.length} actions
            </div>
          }
        />

        <WeekBar
          statusMap={completionMap}
          usedClassName="h-3 w-3 rounded-full bg-sky-400"
          pastClassName="h-0.5 w-3 rounded-full bg-sky-200"
          futureClassName="h-2 w-2 rounded-full border border-sky-300 bg-transparent"
          fallbackClassName="h-0.5 w-3 rounded-full bg-sky-200"
        />

        {/* Routine Manager */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative rounded-3xl border border-black/10 bg-white/70 backdrop-blur px-6 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.3em] text-black/50">Routine manager</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">
                {actions.length} actions
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {actions.map((action, index) => (
                <div
                  key={action.id}
                  className="rounded-2xl border border-black/10 bg-white/80 px-3 py-2 shadow-inner"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] transition ${actionRecords[action.id]?.completed
                        ? "border-black bg-black text-white"
                        : "border-black/10 text-black/60 hover:border-black/60 hover:bg-black hover:text-white"
                        }`}
                      onClick={() => toggleActionCompletion(action.id)}
                      aria-label="Toggle action completed"
                      type="button"
                    >
                      {actionRecords[action.id]?.completed ? "Done" : "Do"}
                    </button>
                    <input
                      className="flex-1 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 rounded-md px-2 py-1"
                      value={action.title}
                      onChange={(e) => {
                        updateAction({ ...action, title: e.target.value });
                      }}
                      aria-label="Edit routine action title"
                    />
                    <div className="w-12 text-right text-[10px] uppercase tracking-[0.2em] text-black/50">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    {managerOpen && (
                      <>
                        <button
                          className="rounded-full border border-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-black/60 transition hover:border-black/60 hover:bg-black hover:text-white"
                          onClick={() => handleMoveAction(index, -1)}
                          aria-label="Move action up"
                          type="button"
                        >
                          <ChevronUpIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="rounded-full border border-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-black/60 transition hover:border-black/60 hover:bg-black hover:text-white"
                          onClick={() => handleMoveAction(index, 1)}
                          aria-label="Move action down"
                          type="button"
                        >
                          <ChevronDownIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="rounded-full border border-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-black/60 transition hover:border-black/60 hover:bg-black hover:text-white"
                          onClick={() => deleteAction(action.id)}
                          aria-label="Delete action"
                          type="button"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {actions.length === 0 && !loading && (
                <div className="rounded-2xl border border-black/10 bg-white/80 px-3 py-4 text-sm text-black/50">
                  Add your first routine action to get started.
                </div>
              )}
            </div>

            {managerOpen && (
              <div className="mt-4 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-inner">
                <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">
                  New action
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    className="flex-1 rounded-2xl border border-black/10 bg-white/80 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-black/20"
                    placeholder="e.g. Make bed"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddAction()}
                  />
                  <button
                    className="h-9 w-9 rounded-full border border-black/20 flex items-center justify-center text-black/70 transition hover:border-black/60 hover:bg-black hover:text-white"
                    onClick={handleAddAction}
                    type="button"
                    aria-label="Add action"
                    title="Add action"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              {managerOpen && (
                <button
                  className="flex items-center gap-2 rounded-full border border-black/20 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-black/70 transition hover:border-black/60 hover:bg-black hover:text-white"
                  onClick={() => {
                    setManagerOpen(false);
                    setTitleInput("");
                  }}
                  type="button"
                  aria-label="Cancel routine manager"
                >
                  Cancel
                </button>
              )}
              <button
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.25em] transition ${
                  managerOpen
                    ? "border-black bg-black text-white"
                    : "border-black/20 text-black/70 hover:border-black/60 hover:bg-black hover:text-white"
                }`}
                onClick={() => setManagerOpen((prev) => !prev)}
                type="button"
                aria-label={managerOpen ? "Close routine manager" : "Edit routine manager"}
              >
                <PencilIcon className="h-3.5 w-3.5" />
                {managerOpen ? "Done" : "Edit"}
              </button>
            </div>
          </div>

          {/* Time Control */}
          <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur px-6 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
            <div className="text-xs uppercase tracking-[0.3em] text-black/50">Time control</div>
            <div className="mt-6 rounded-2xl border border-black/10 bg-white/80 px-5 py-6 text-center shadow-inner">
              {completedToday ? (
                <div className="text-lg font-semibold tracking-tight">Today completed ✅</div>
              ) : (
                <button
                  className="w-full rounded-2xl border border-sky-300 bg-sky-400 px-6 py-6 text-xs uppercase tracking-[0.35em] text-white transition hover:border-sky-400 hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => setRunnerOpen(true)}
                  disabled={actions.length === 0}
                  type="button"
                >
                  Start Morning Routine
                </button>
              )}
              {!completedToday && actions.length === 0 && !loading && (
                <div className="mt-3 text-xs text-black/50">
                  Add at least one action to start your routine.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <BottomBar active="morning" />

      {runnerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[#f8f6f1]/90 backdrop-blur" />
          <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.3em] text-black/50">
                Morning runner
              </div>
              <button
                className="rounded-full border border-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-black/60 transition hover:border-black/60 hover:bg-black hover:text-white"
                onClick={() => setRunnerOpen(false)}
                type="button"
                aria-label="Close routine runner"
                title="Close routine runner"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-8 flex flex-1 flex-col">
              <div className="rounded-3xl border border-black/10 bg-white/80 px-6 py-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
                <div className="text-[10px] uppercase tracking-[0.3em] text-black/50">
                  Local time
                </div>
                <div className="mt-3 text-5xl font-semibold tracking-tight">
                  {now.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="mt-3 text-xs text-black/60">
                  Step {actions.length === 0 ? 0 : Math.max(currentIndex + 1, 0)}/
                  {actions.length}
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-black/10 bg-white/80 px-5 py-5 shadow-inner">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">
                    Current task
                  </div>
                  <div className="mt-3 text-2xl font-semibold tracking-tight">
                    {currentAction ? currentAction.title : "All done"}
                  </div>
                  <div className="mt-3 text-sm text-black/60">
                    Remaining time: {formatRemaining(remainingSeconds)}
                  </div>
                </div>

                <div className="rounded-3xl border border-black/10 bg-white/80 px-5 py-5 shadow-inner">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">
                    Up next
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-black/70">
                    {upcomingActions.length > 0 ? (
                      upcomingActions.map((action, idx) => (
                        <div key={action.id} className="flex items-center justify-between">
                          <span>{action.title}</span>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-black/50">
                            {String(currentIndex + idx + 2).padStart(2, "0")}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-black/50">No more actions.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center">
                <button
                  className="rounded-full border border-black/20 px-6 py-3 text-xs uppercase tracking-[0.3em] text-black/70 transition hover:border-black/60 hover:bg-black hover:text-white disabled:opacity-50"
                  onClick={handleMoveToNext}
                  disabled={actions.length === 0 || !currentAction}
                  type="button"
                >
                  Move to next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
