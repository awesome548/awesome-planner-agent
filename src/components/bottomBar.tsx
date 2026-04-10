import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useAuthStore } from "@/lib/auth-store";
import { getSupabaseClient } from "@/lib/supabase";
import { CircleUserRound } from "lucide-react";

type BottomBarProps = {
  active: "home" | "usage" | "plan" | "morning";
};

export default function BottomBar({ active }: BottomBarProps) {
  const { data: session } = useSession();
  const supabaseUser = useAuthStore((s) => s.user);

  const base = "px-3.5 py-1.5 text-xs font-medium tracking-wide rounded-full transition-colors";
  const inactive = "text-black/40 hover:text-black";
  const activeClasses = "bg-black text-white";

  return (
    <div className="fixed bottom-6 inset-x-0 flex justify-center z-20 pointer-events-auto">
      <div className="rounded-full bg-white border border-black/8 shadow-sm p-1 flex items-center gap-0.5">
        <Link className={`${base} ${active === "home" ? activeClasses : inactive}`} href="/">
          Home
        </Link>
        <Link className={`${base} ${active === "usage" ? activeClasses : inactive}`} href="/usage">
          Record
        </Link>
        <Link className={`${base} ${active === "plan" ? activeClasses : inactive}`} href="/plan">
          Plan
        </Link>
        <Link className={`${base} ${active === "morning" ? activeClasses : inactive}`} href="/morning">
          Morning
        </Link>

        <div className="w-px h-5 bg-black/8 mx-1" />

        <button
          className="rounded-full h-8 w-8 overflow-hidden hover:opacity-80 transition-opacity flex items-center justify-center shrink-0"
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
              className="h-full w-full object-cover rounded-full"
            />
          ) : (
            <CircleUserRound className="h-4 w-4 text-black/30" />
          )}
        </button>
      </div>
    </div>
  );
}
