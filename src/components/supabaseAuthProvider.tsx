"use client";

import { useAuthStore } from "@/lib/auth-store";
import SupabaseAuthUI from "./supabaseAuth";
import { Loader2 } from "lucide-react";

export default function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f6f1]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <SupabaseAuthUI />;
  }

  return <>{children}</>;
}
