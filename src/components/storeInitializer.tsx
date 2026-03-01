"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useUsageStore } from "@/lib/usage-store";
import { useRoutineStore } from "@/lib/morning-routine-store";

export default function StoreInitializer() {
  const initializeAuth = useAuthStore((s) => s.initialize);
  const user = useAuthStore((s) => s.user);
  const reinitializeUsage = useUsageStore((s) => s.reinitialize);
  const reinitializeRoutine = useRoutineStore((s) => s.reinitialize);

  // Boot the single auth subscription once.
  useEffect(() => {
    const unsubscribe = initializeAuth();
    return unsubscribe;
  // initializeAuth is stable (Zustand action reference never changes).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-initialize data stores whenever the signed-in user changes.
  const prevUserId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (user?.id === prevUserId.current) return;
    prevUserId.current = user?.id;
    reinitializeUsage();
    reinitializeRoutine();
  }, [user?.id, reinitializeUsage, reinitializeRoutine]);

  return null;
}
