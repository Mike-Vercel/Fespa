import { cn } from "@/lib/cn";

const TONES = ["bg-avatar-1", "bg-avatar-2", "bg-avatar-3", "bg-avatar-4"] as const;

const SIZES = {
  sm: "size-8 text-[13px]",
  md: "size-10 text-[15px]",
  lg: "size-14 text-xl",
  xl: "size-20 text-[28px]",
} as const;

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

/** Tono stabile per nome: la stessa persona ha sempre lo stesso colore. */
function toneOf(name: string): (typeof TONES)[number] {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return TONES[hash % TONES.length];
}

/**
 * Avatar con iniziali: nessuna immagine esterna da caricare, nessun dato personale in più.
 * È decorativo (il nome è sempre scritto accanto), quindi nascosto alle tecnologie assistive.
 */
export function Avatar({ name, size = "md", className }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-sans font-semibold tracking-[0.02em] text-avatar-ink",
        toneOf(name),
        SIZES[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
