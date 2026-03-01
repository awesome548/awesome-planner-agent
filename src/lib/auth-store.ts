import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";

export type ApprovalStatus = "pending" | "approved" | "rejected";

interface AuthStore {
  user: User | null;
  session: Session | null;
  /** True while the initial auth state is being read from localStorage. */
  loading: boolean;
  /**
   * null  = approval status not yet fetched (or no user).
   * other = fetched value.
   */
  approvalStatus: ApprovalStatus | null;
  /** Set up the single onAuthStateChange subscription. Returns the unsubscribe fn. */
  initialize: () => () => void;
}

/**
 * Fetches the user's approval status and writes it to the store.
 * Never throws — defaults to "pending" on any error.
 */
async function loadApproval(userId: string): Promise<void> {
  try {
    const { data } = await getSupabaseClient()
      .from("user_approvals")
      .select("status")
      .eq("user_id", userId)
      .single();
    useAuthStore.setState({
      approvalStatus: (data?.status as ApprovalStatus) ?? "pending",
    });
  } catch {
    useAuthStore.setState({ approvalStatus: "pending" });
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,
  approvalStatus: null,

  initialize: () => {
    const supabase = getSupabaseClient();

    // Seed from localStorage synchronously, then confirm via server.
    // loading → false as soon as we know the auth state; approval loads separately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, loading: false });
      if (session?.user) loadApproval(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        set({
          session,
          user: session.user,
          loading: false,
          approvalStatus: null, // reset so the gate shows the spinner while re-fetching
        });
        loadApproval(session.user.id);
      } else {
        set({ session: null, user: null, loading: false, approvalStatus: null });
      }
    });

    return () => subscription.unsubscribe();
  },
}));
