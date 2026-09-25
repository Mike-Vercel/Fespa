import { cn } from "@/lib/cn";

/**
 * Sfondo atmosferico FESPA dietro barra superiore e intestazione (vedi .page-atmosphere in globals.css).
 * Va reso fuori da contenitori con transform: si posiziona sulla colonna del contenuto del layout.
 * "soft" è la versione più delicata per le pagine con un elenco subito sotto il titolo.
 */
export function PageAtmosphere({ variant = "default" }: { variant?: "default" | "soft" }) {
  return <div aria-hidden="true" className={cn("page-atmosphere", variant === "soft" && "page-atmosphere--soft")} />;
}
