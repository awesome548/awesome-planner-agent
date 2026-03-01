import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useAuthStore } from "@/lib/auth-store";
import { getSupabaseClient } from "@/lib/supabase";
import { UserCircleIcon } from "@heroicons/react/24/outline";

type BottomBarProps = {
  active: "usage" | "plan" | "morning";
};

export default function BottomBar({ active }: BottomBarProps) {
  const { data: session } = useSession();
  const supabaseUser = useAuthStore((s) => s.user);

  const base = "px-4 py-2 text-sm rounded-full transition";
  const inactive = "text-black/70 hover:bg-black/5 hover:text-black";
  const activeClasses = "bg-black text-white hover:bg-black/90";

  return (
    <div className="fixed bottom-6 inset-x-0 flex justify-center z-20 pointer-events-auto">
      <div className="rounded-full bg-white/90 border border-black/10 shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur p-1.5 flex items-center gap-1.5">
        <div className="flex items-center gap-1">
          <Link
            className={`${base} ${active === "usage" ? activeClasses : inactive}`}
            href="/usage"
          >
            All
          </Link>
          <Link
            className={`${base} ${active === "plan" ? activeClasses : inactive}`}
            href="/"
          >
            Plan
          </Link>
          <Link
            className={`${base} ${active === "morning" ? activeClasses : inactive}`}
            href="/morning"
          >
            Morning
          </Link>
        </div>
        
        <div className="w-px h-6 bg-black/5 mx-0.5" />

        <button
          className="rounded-full h-9 w-9 border border-black/5 bg-white/50 overflow-hidden hover:bg-white/80 transition-all flex items-center justify-center shrink-0"
          onClick={async () => {
            if (session || supabaseUser) {
              await getSupabaseClient().auth.signOut();
              signOut();
            } else {
              signIn("google");
            }
          }}
          aria-label={(session || supabaseUser) ? "Sign out" : "Sign in"}
          title={(session || supabaseUser) ? "Sign out" : "Sign in"}
        >
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserCircleIcon className="h-5 w-5 text-black/40" />
          )}
        </button>
      </div>
    </div>
  );
}
