"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [transitionKey, setTransitionKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setTransitionKey((prev) => prev + 1);
    setIsTransitioning(true);
    const timeout = setTimeout(() => setIsTransitioning(false), 420);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <SessionProvider>
      <div className="page-frame">
        <div
          aria-hidden="true"
          className={`page-transition-scrim ${isTransitioning ? "is-active" : ""}`}
        />
        <div key={transitionKey} className="page-transition-content">
          {children}
        </div>
      </div>
    </SessionProvider>
  );
}
