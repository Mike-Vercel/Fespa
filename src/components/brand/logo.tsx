import Image from "next/image";
import { cn } from "@/lib/cn";

/** Simbolo FESPA usato nella sidebar e nella navigazione compatta. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex size-8 shrink-0 overflow-hidden rounded-md bg-white", className)} aria-hidden="true">
      <Image
        src="/images/brand/logo-sidebar.webp"
        alt=""
        width={256}
        height={256}
        quality={100}
        sizes="(min-width: 1024px) 112px, 80px"
        className="size-full object-cover"
        priority
      />
    </span>
  );
}

/** `subtitle` distingue il contesto: l'app ("Coach AI") o il sito pubblico. */
export function Wordmark({ className, subtitle = "Coach AI" }: { className?: string; subtitle?: string }) {
  return (
    <span className={cn("flex min-w-0 flex-col leading-none", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">FESPA</span>
      <span className="mt-1 font-serif text-[15px] italic text-ink-2">{subtitle}</span>
    </span>
  );
}
