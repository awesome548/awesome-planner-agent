"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { getSupabaseClient, signInWithGoogleIdToken } from "@/lib/supabase";

/**
 * Runs once per mount. Exchanges the Google ID token from NextAuth for a
 * Supabase Auth session, which is then persisted in localStorage.
 * Subsequent page loads reuse the Supabase session directly — no re-exchange needed.
 */
export default function SupabaseSync() {
  const { data: session } = useSession();

  useEffect(() => {
    const idToken = (session as any)?.id_token as string | undefined;
    if (!idToken) return;

    const sync = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();

      // Already have a valid Supabase session — nothing to do.
      if (data.session) return;

      try {
        await signInWithGoogleIdToken(idToken);
      } catch {
        // Silently ignore — the user may need to sign in again via NextAuth
        // for a fresh id_token (they expire after ~1 hour).
      }
    };

    sync();
  // Re-run only when the NextAuth session's id_token changes (initial sign-in).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(session as any)?.id_token]);

  return null;
}
