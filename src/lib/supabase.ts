import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  // persistSession + autoRefreshToken are true by default in browser environments.
  // The session is stored in localStorage under sb-<project>-auth-token.
  cachedClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return cachedClient;
}

/** Returns the current Supabase Auth user UUID, or null if not signed in. */
export async function getSupabaseUserId(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { data } = await getSupabaseClient().auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Creates a Supabase Auth session from a Google ID token obtained via NextAuth.
 * The session (+ refresh token) is automatically persisted in localStorage.
 */
export async function signInWithGoogleIdToken(idToken: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (error) {
    console.error("[supabase] signInWithIdToken error:", error.message);
    throw error;
  }
}
