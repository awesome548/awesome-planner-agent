import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";

interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Set up the single onAuthStateChange subscription. Returns the unsubscribe fn. */
  initialize: () => () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: () => {
    const supabase = getSupabaseClient();

    // Seed initial state from localStorage cache (synchronous) then confirm via server.
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        set({ session, user: session?.user ?? null, loading: false });
      }
    );

    return () => subscription.unsubscribe();
  },
}));
