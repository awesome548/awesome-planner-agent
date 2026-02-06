"use client";

import { useEffect } from "react";
import { useUsageStore } from "@/lib/usage-store";
import { useRoutineStore } from "@/lib/morning-routine-store";

export default function StoreInitializer() {
  const initializeUsage = useUsageStore((s) => s.initialize);
  const initializeRoutine = useRoutineStore((s) => s.initialize);

  useEffect(() => {
    initializeUsage();
    initializeRoutine();
  }, [initializeUsage, initializeRoutine]);

  return null;
}
