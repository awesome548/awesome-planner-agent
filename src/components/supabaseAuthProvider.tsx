"use client";

import { useAuthStore } from "@/lib/auth-store";
import SupabaseAuthUI from "./supabaseAuth";
import PendingApproval from "./pendingApproval";
import { Loader2 } from "lucide-react";

export default function SupabaseAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const approvalStatus = useAuthStore((s) => s.approvalStatus);

  // Spinner while:
  //   1. auth state is being read from localStorage, OR
  //   2. user is known but approval status hasn't come back yet
  if (loading || (user && approvalStatus === null)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f6f1]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <SupabaseAuthUI />;
  }

  if (approvalStatus !== "approved") {
    return <PendingApproval status={approvalStatus} />;
  }

  return <>{children}</>;
}
