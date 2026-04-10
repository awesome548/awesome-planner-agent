"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

export default function StoreInitializer() {
  const initializeAuth = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
