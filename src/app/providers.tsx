"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import StoreInitializer from "@/components/storeInitializer";
import SupabaseSync from "@/components/supabaseSync";
import SupabaseAuthProvider from "@/components/supabaseAuthProvider";
import { queryClient } from "@/lib/query-client";

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timeout = setTimeout(() => setIsTransitioning(false), 420);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {/* Must be outside SupabaseAuthProvider — these boot the auth store.
            If placed inside, the auth gate blocks them from mounting, causing
            loading to never resolve (deadlock). */}
        <StoreInitializer />
        <SupabaseSync />
        <SupabaseAuthProvider>
          <div className="page-frame">
            <div
              aria-hidden="true"
              className={`page-transition-scrim ${isTransitioning ? "is-active" : ""}`}
            />
            {/* Fix #1 (issue #1): key removed — keying on transitionKey caused a full React
                unmount/remount on every navigation, resetting all page-level useState (runnerOpen,
                timers, etc.). The scrim overlay still provides the visual transition. */}
            <div className="page-transition-content">
              {children}
            </div>
          </div>
        </SupabaseAuthProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
