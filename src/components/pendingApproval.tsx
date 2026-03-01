"use client";

import { signOut as nextAuthSignOut } from "next-auth/react";
import { getSupabaseClient } from "@/lib/supabase";
import type { ApprovalStatus } from "@/lib/auth-store";

export default function PendingApproval({
  status,
}: {
  status: ApprovalStatus | null;
}) {
  const isRejected = status === "rejected";

  const handleSignOut = async () => {
    await getSupabaseClient().auth.signOut();
    await nextAuthSignOut({ callbackUrl: "/" });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8f6f1]">
      <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur shadow-[0_18px_50px_rgba(0,0,0,0.08)] p-10 max-w-sm w-full text-center">
        {isRejected ? (
          <>
            <h1 className="text-xl font-semibold text-[#0c0c0c] mb-2">
              Access Denied
            </h1>
            <p className="text-sm text-black/50">
              Your account request has been rejected.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-[#0c0c0c] mb-2">
              Pending Approval
            </h1>
            <p className="text-sm text-black/50">
              Your account is awaiting administrator approval.
            </p>
          </>
        )}

        <button
          onClick={handleSignOut}
          className="mt-6 rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.3em] hover:bg-black/5 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
