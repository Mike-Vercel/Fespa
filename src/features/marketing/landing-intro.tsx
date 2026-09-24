"use client";

import { useCallback, useState, type ReactNode } from "react";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { UsernameReel } from "./username-reel";

export function LandingIntro({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const handleComplete = useCallback(() => setReady(true), []);

  return (
    <div className="relative min-h-dvh bg-white">
      <div className={cn("landing-intro", ready && "landing-intro--exit")} aria-hidden={ready}>
        <div className="landing-intro__line">
          <div className="flex shrink-0 items-center gap-3">
            <LogoMark className="size-20 rounded-2xl sm:size-28" />
            <Wordmark className="text-left [&>span:first-child]:text-[9px] [&>span:last-child]:mt-0.5 [&>span:last-child]:text-[13px] sm:[&>span:first-child]:text-[10px] sm:[&>span:last-child]:text-[14px]" />
          </div>
          <span className="landing-intro__slash">/</span>
          <UsernameReel
            names={["ritrova-il-tuo-equilibrio", "mangia-senza-sensi-di-colpa", "ascolta-il-tuo-corpo"]}
            finalName="ritrova-il-tuo-equilibrio"
            prefix=""
            rows={3}
            cycles={2}
            spinDuration={3.4}
            loop={false}
            onComplete={handleComplete}
            className="min-w-0 justify-start bg-white"
          />
        </div>
      </div>
      <div className={cn("landing-content", ready && "landing-content--ready")}>{children}</div>
    </div>
  );
}
