"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { markTodayUsed } from "@/lib/usage";

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
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string>("");

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
    markTodayUsed();
  }

  async function confirmAndCreate() {
    if (!plan) return;
    setCreating(true);
    setMsg("");

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch("/api/calendar/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, timeZone }),
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
    <main className="min-h-screen p-8 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Planner Agent (MVP)</h1>
        <div className="flex gap-3 items-center">
          <a className="underline" href="/usage">Usage</a>
          {!session ? (
            <button className="border rounded px-3 py-2" onClick={() => signIn("google")}>
              Sign in
            </button>
          ) : (
            <button className="border rounded px-3 py-2" onClick={() => signOut()}>
              Sign out
            </button>
          )}
        </div>
      </div>

      <textarea
        className="w-full border rounded p-3 h-32"
        placeholder='e.g. "Tomorrow: laundry, write report, book dentist"'
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        className="px-4 py-2 rounded border"
        onClick={generatePlan}
        disabled={loading || !text.trim()}
      >
        {loading ? "Planning..." : "Generate Plan"}
      </button>

      {msg && <div className="text-sm">{msg}</div>}

      {plan && (
        <div className="border rounded p-4 space-y-3">
          <div className="font-semibold">Preview (edit later if you want)</div>

          <div className="space-y-2">
            {plan.tasks.map((t, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{t.title}</span>{" "}
                — {t.date} {t.start_time} ({t.duration_minutes}m, {t.difficulty})
              </div>
            ))}
          </div>

          <button
            className="px-4 py-2 rounded border"
            onClick={confirmAndCreate}
            disabled={!session || creating}
            title={!session ? "Sign in to create Google Calendar events" : ""}
          >
            {creating ? "Creating events..." : "Confirm & Create Google Calendar Events"}
          </button>

          {!session && (
            <div className="text-xs text-gray-600">
              Sign in first to create events in your calendar.
            </div>
          )}
        </div>
      )}
    </main>
  );
}
