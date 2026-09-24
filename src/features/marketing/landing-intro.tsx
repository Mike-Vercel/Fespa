"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { UsernameReel } from "./username-reel";

export function LandingIntro({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const handleComplete = useCallback(() => setReady(true), []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setReady(true), 9000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="relative min-h-dvh bg-white">
      <div className={cn("landing-intro", ready && "landing-intro--exit")} aria-hidden={ready}>
        <div className="landing-intro__line">
          <span className="landing-intro__wordmark" aria-label="FESPA">
            {["F", "E", "S", "P", "A"].map((letter, index) => (
              <span key={letter} className="landing-intro__letter" style={{ "--letter-delay": `${index * 90 + 80}ms` } as CSSProperties}>
                {letter}
              </span>
            ))}
          </span>
          <div className="landing-intro__reel flex min-w-0 items-center justify-center">
            <UsernameReel
              names={["ritrova-il-tuo-equilibrio", "mangia-senza-sensi-di-colpa", "ascolta-il-tuo-corpo"]}
              finalName="ritrova-il-tuo-percorso"
              prefix=""
              rows={3}
              cycles={2}
              spinDuration={3.4}
              spinDelay={1350}
              highlightColor="#ff7eb6"
              placeholderColor="#a7a7a7"
              surfaceColor="#0b0b0b"
              loop={false}
              onComplete={handleComplete}
              className="w-full min-w-0 justify-center bg-white"
            />
          </div>
        </div>
      </div>
      <div className={cn("landing-content", ready && "landing-content--ready")}>{children}</div>
    </div>
  );
}
