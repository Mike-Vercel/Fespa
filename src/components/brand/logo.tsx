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

const WORDMARK_SIZES = {
  md: { name: "text-[11px] tracking-[0.18em]", subtitle: "mt-1 text-[15px]" },
  lg: { name: "text-[15px] tracking-[0.14em]", subtitle: "mt-1 text-[19px]" },
} as const;

/** `subtitle` distingue il contesto: l'app ("Coach AI") o il sito pubblico. */
export function Wordmark({
  className,
  subtitle = "Coach AI",
  size = "md",
}: {
  className?: string;
  subtitle?: string;
  size?: keyof typeof WORDMARK_SIZES;
}) {
  const sizes = WORDMARK_SIZES[size];
  return (
    <span className={cn("flex min-w-0 flex-col leading-none", className)}>
      <span className={cn("font-semibold uppercase text-ink", sizes.name)}>FESPA</span>
      <span className={cn("font-serif italic text-ink-2", sizes.subtitle)}>{subtitle}</span>
    </span>
  );
}
