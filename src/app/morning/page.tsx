"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SunIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  deleteRoutineAction,
  getRoutineActions,
  markTodayRoutineCompleted,
  RoutineAction,
  updateRoutineOrder,
  upsertRoutineAction,
} from "@/lib/morning-routine";
import BottomBar from "@/components/bottomBar";
import PageHeader from "@/components/pageHeader";



function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function MorningRoutinePage() {
  const [actions, setActions] = useState<RoutineAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [titleInput, setTitleInput] = useState("");
  const [durationInput, setDurationInput] = useState("1");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const actionsRef = useRef(actions);
  const indexRef = useRef(currentIndex);

  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await getRoutineActions();
      if (!active) return;
      setActions(loaded);
      if (loaded.length > 0) {
        setCurrentIndex(0);
        setRemainingSeconds(loaded[0].duration_minutes * 60);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    if (actionsRef.current.length === 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev > 1) return prev - 1;

        const list = actionsRef.current;
        const idx = indexRef.current;
        if (idx < list.length - 1) {
          const nextIndex = idx + 1;
          indexRef.current = nextIndex;
          setCurrentIndex(nextIndex);
          return list[nextIndex]?.duration_minutes * 60 || 0;
        }

        setIsRunning(false);
        markTodayRoutineCompleted();
        return 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  const currentAction = actions[currentIndex];
  const nextAction = actions[currentIndex + 1];

  const totalMinutes = useMemo(
    () => actions.reduce((sum, action) => sum + action.duration_minutes, 0),
    [actions]
  );

  function resetRoutine() {
    setIsRunning(false);
    setCurrentIndex(0);
    setRemainingSeconds(actions[0]?.duration_minutes ? actions[0].duration_minutes * 60 : 0);
  }

  async function addAction() {
    const duration = Number(durationInput);
    if (!titleInput.trim() || Number.isNaN(duration) || duration <= 0) return;

    const action: RoutineAction = {
      id: crypto.randomUUID(),
      title: titleInput.trim(),
      duration_minutes: duration,
      position: actions.length,
    };

    const next = [...actions, action];
    setActions(next);
    if (actions.length === 0) {
      setCurrentIndex(0);
      setRemainingSeconds(action.duration_minutes * 60);
    }
    setTitleInput("");
    setDurationInput("1");
    await upsertRoutineAction(action);
  }

  async function saveAction(action: RoutineAction) {
    await upsertRoutineAction(action);
  }

  async function removeAction(id: string) {
    const next = actions.filter((action) => action.id !== id).map((action, index) => ({
      ...action,
      position: index,
    }));
    setActions(next);
    await deleteRoutineAction(id);
    await updateRoutineOrder(next);
    if (currentIndex >= next.length) {
      setCurrentIndex(Math.max(next.length - 1, 0));
    }
    if (!isRunning) {
      setRemainingSeconds(next[0]?.duration_minutes ? next[0].duration_minutes * 60 : 0);
    }
  }

  async function moveAction(index: number, direction: number) {
    const next = [...actions];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;

    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    const normalized = next.map((action, idx) => ({ ...action, position: idx }));
    setActions(normalized);
    await updateRoutineOrder(normalized);
    if (currentIndex === index) setCurrentIndex(target);
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#f8f6f1] text-[#0c0c0c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f8f6f1_55%,_#f1efe8_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(#1a1a1a1a_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-10 pb-32">
        <PageHeader
          eyebrow="Morning routine"
          title="Flow, focus, finish strong"
          icon={<SunIcon className="size-6" />}
          right={<div className="text-xs uppercase tracking-[0.3em] text-black/50">{totalMinutes} min</div>}
        />

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur px-6 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
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
                    <input
                      className="flex-1 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black/20 rounded-md px-2 py-1"
                      value={action.title}
                      onChange={(e) => {
                        const next = [...actions];
                        next[index] = { ...next[index], title: e.target.value };
                        setActions(next);
                      }}
                      onBlur={() => saveAction(actions[index])}
                      aria-label="Edit routine action title"
                    />
                    <input
                      className="w-20 bg-transparent text-sm text-right focus:outline-none focus:ring-2 focus:ring-black/20 rounded-md px-2 py-1"
                      type="number"
                      min={1}
                      value={action.duration_minutes}
                      onChange={(e) => {
                        const next = [...actions];
                        next[index] = {
                          ...next[index],
                          duration_minutes: Number(e.target.value),
                        };
                        setActions(next);
                      }}
                      onBlur={() => saveAction(actions[index])}
                      aria-label="Edit routine action duration"
                    />
                    <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">min</div>
                    <button
                      className="rounded-full border border-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-black/60 transition hover:border-black/60 hover:bg-black hover:text-white"
                      onClick={() => moveAction(index, -1)}
                      aria-label="Move action up"
                      type="button"
                    >
                      <ChevronUpIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded-full border border-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-black/60 transition hover:border-black/60 hover:bg-black hover:text-white"
                      onClick={() => moveAction(index, 1)}
                      aria-label="Move action down"
                      type="button"
                    >
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded-full border border-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-black/60 transition hover:border-black/60 hover:bg-black hover:text-white"
                      onClick={() => removeAction(action.id)}
                      aria-label="Delete action"
                      type="button"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {actions.length === 0 && !loading && (
                <div className="rounded-2xl border border-black/10 bg-white/80 px-3 py-4 text-sm text-black/50">
                  Add your first routine action to get started.
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-inner">
              <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">New action</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  className="flex-1 rounded-2xl border border-black/10 bg-white/80 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-black/20"
                  placeholder="e.g. Make bed"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                />
                <input
                  className="w-24 rounded-2xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-right shadow-inner focus:outline-none focus:ring-2 focus:ring-black/20"
                  type="number"
                  min={1}
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  aria-label="Duration in minutes"
                />
                <button
                  className="h-9 w-9 rounded-full border border-black/20 flex items-center justify-center text-black/70 transition hover:border-black/60 hover:bg-black hover:text-white"
                  onClick={addAction}
                  type="button"
                  aria-label="Add action"
                  title="Add action"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur px-6 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
            <div className="text-xs uppercase tracking-[0.3em] text-black/50">Timer flow</div>
            <div className="mt-4 rounded-2xl border border-black/10 bg-white/80 px-4 py-4 shadow-inner">
              <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">Current task</div>
              <div className="mt-2 text-lg font-semibold tracking-tight">
                {currentAction ? currentAction.title : "No actions yet"}
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">
                {formatSeconds(remainingSeconds)}
              </div>
              <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-black/50">Up next</div>
              <div className="mt-1 text-sm text-black/70">
                {nextAction ? `${nextAction.title} · ${nextAction.duration_minutes}m` : "You're done"}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                className="h-9 w-9 rounded-full border border-black/20 flex items-center justify-center text-black/70 transition hover:border-black/60 hover:bg-black hover:text-white disabled:opacity-50"
                onClick={() => {
                  if (!actions.length) return;
                  if (remainingSeconds === 0) {
                    setCurrentIndex(0);
                    setRemainingSeconds(actions[0].duration_minutes * 60);
                  }
                  setIsRunning(true);
                }}
                disabled={actions.length === 0 || isRunning}
                type="button"
                aria-label="Start routine"
                title="Start routine"
              >
                <PlayIcon className="h-4 w-4" />
              </button>
              <button
                className="h-9 w-9 rounded-full border border-black/20 flex items-center justify-center text-black/70 transition hover:border-black/60 hover:bg-black hover:text-white disabled:opacity-50"
                onClick={() => setIsRunning(false)}
                disabled={!isRunning}
                type="button"
                aria-label="Pause routine"
                title="Pause routine"
              >
                <PauseIcon className="h-4 w-4" />
              </button>
              <button
                className="h-9 w-9 rounded-full border border-black/20 flex items-center justify-center text-black/70 transition hover:border-black/60 hover:bg-black hover:text-white disabled:opacity-50"
                onClick={resetRoutine}
                disabled={actions.length === 0}
                type="button"
                aria-label="Reset routine"
                title="Reset routine"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 text-xs text-black/60">
              Routine progress: {actions.length === 0 ? 0 : currentIndex + 1}/{actions.length || 0}
            </div>
          </div>
        </section>
      </div>

      <BottomBar active="morning" />
    </main>
  );
}
