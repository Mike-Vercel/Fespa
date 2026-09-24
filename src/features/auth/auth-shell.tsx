import Link from "next/link";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { JOURNEY_STEPS } from "@/features/marketing/content";
import { cn } from "@/lib/cn";
import { AuthVariantReady, type AuthVariant } from "./auth-swap";

/** Accesso: le stesse pagine servono coach e clienti, quindi il messaggio vale per entrambe. */
const ACCESS_PRINCIPLES = [
  "Check-in settimanali e risposte della coach in un unico posto",
  "Lo storico del percorso, sempre a portata di mano",
  "L'AI propone, la coach decide: nessuna azione senza conferma",
];

type AuthShellProps = {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * "signup": layout specchiato (form a sinistra) e, a lato, i passi del percorso.
   * Passando da una variante all'altra i pannelli si scambiano di lato con un'animazione.
   */
  variant?: AuthVariant;
};

/*
 * Nomi di view transition diversi per lato: il pannello di partenza e quello di arrivo non vengono
 * "fusi" in un unico movimento orizzontale, ma escono ed entrano ognuno per conto suo (vedi globals.css).
 */
const ASIDE_TRANSITION = {
  access: "[view-transition-name:auth-aside-left]",
  signup: "[view-transition-name:auth-aside-right]",
} as const;
const FORM_TRANSITION = {
  access: "[view-transition-name:auth-form-right]",
  signup: "[view-transition-name:auth-form-left]",
} as const;

/*
 * Foto del pannello laterale, solo da lg: su mobile il pannello è una barra con il logo e
 * l'immagine non viene nemmeno scaricata (lo sfondo è dentro una media query).
 * Entrambe le foto hanno la zona luminosa a sinistra, dove sta il testo.
 */
const DESKTOP_MEDIA = "(min-width: 1024px)";
const PANEL_IMAGE = {
  access: { src: "/images/auth/login.webp", className: "lg:bg-[url(/images/auth/login.webp)]" },
  signup: { src: "/images/auth/registrati.webp", className: "lg:bg-[url(/images/auth/registrati.webp)]" },
} as const;
const OTHER_VARIANT = { access: "signup", signup: "access" } as const satisfies Record<AuthVariant, AuthVariant>;

/** Pannello del form: nero nel login (tema scuro locale), bianco nella registrazione; focus viola in entrambi. */
const FORM_PANEL = {
  access: "theme-dark accent-violet",
  signup: "bg-surface accent-violet",
} as const;

/** Barra in alto su mobile: nel login nero lucido, in contrasto con il nero opaco del form. */
const MOBILE_BAR = {
  access: "max-lg:glossy-black max-lg:border-on-ink/10",
  signup: "",
} as const;

function AccessAside() {
  return (
    <>
      <p className="font-serif text-[40px] leading-[1.1] tracking-[-0.01em] text-ink text-balance xl:text-[46px]">
        Coach e clienti, <em className="text-accent-strong">nello stesso percorso.</em>
      </p>
      <ul className="mt-10 divide-y divide-line border-y border-line">
        {ACCESS_PRINCIPLES.map((principle, index) => (
          <li key={principle} className="flex gap-4 py-3.5 text-[15px] text-ink-2">
            <span className="tabular font-serif text-ink-3">0{index + 1}</span>
            {principle}
          </li>
        ))}
      </ul>
    </>
  );
}

function SignupAside() {
  return (
    <>
      <p className="font-serif text-[40px] leading-[1.1] tracking-[-0.01em] text-ink text-balance xl:text-[46px]">
        Il tuo percorso <em className="text-accent-strong">inizia qui.</em>
      </p>
      <ol className="mt-10 divide-y divide-line border-y border-line">
        {JOURNEY_STEPS.map((step, index) => {
          const isCurrent = index === 0;
          return (
            <li key={step.title} aria-current={isCurrent ? "step" : undefined} className="flex gap-4 py-3.5 text-[15px]">
              <span className={cn("tabular font-serif", isCurrent ? "text-accent-strong" : "text-ink-3")}>{index + 1}</span>
              <span className={isCurrent ? "font-medium text-ink" : "text-ink-2"}>
                {step.title}
                {isCurrent ? <span className="ml-2 text-xs font-normal text-accent-strong">sei qui</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** Impaginazione comune alle pagine di accesso: pannello editoriale + form. */
export function AuthShell({ title, description, children, footer, variant = "access" }: AuthShellProps) {
  const isSignup = variant === "signup";
  const panelImage = PANEL_IMAGE[variant];
  // La foto è lo sfondo più grande della pagina: su desktop la si scarica subito, su mobile mai.
  preload(panelImage.src, { as: "image", media: DESKTOP_MEDIA, fetchPriority: "high" });
  // Anche quella dell'altra pagina, con bassa priorità: nello scambio login ⇄ registrazione è già pronta.
  preload(PANEL_IMAGE[OTHER_VARIANT[variant]].src, { as: "image", media: DESKTOP_MEDIA, fetchPriority: "low" });

  return (
    <div
      className={cn(
        "grid min-h-dvh grid-cols-1 grid-rows-[auto_1fr] overflow-x-clip lg:grid-rows-none",
        isSignup
          ? "lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,640px)_minmax(0,1fr)]"
          : "lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,640px)]",
      )}
    >
      <AuthVariantReady variant={variant} />
      <aside
        className={cn(
          // Sotto lg il pannello è una barra compatta in alto con il solo logo, centrato.
          "relative isolate flex flex-col justify-between gap-10 border-b border-line bg-sidebar px-6 py-3 sm:px-10 lg:border-b-0 lg:px-14 lg:py-12",
          "lg:bg-cover lg:bg-center",
          panelImage.className,
          MOBILE_BAR[variant],
          "[view-transition-class:auth-aside]",
          ASIDE_TRANSITION[variant],
          // Su schermi piccoli il pannello resta sempre in alto; da lg si sposta a destra nella registrazione.
          isSignup ? "lg:order-2 lg:border-l" : "lg:border-r",
        )}
      >
        {/* Velo color carta da sinistra: il testo resta leggibile, la foto si vede piena a destra. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 hidden bg-linear-to-r from-paper/90 via-paper/55 to-transparent lg:block"
        />
        <Link
          href="/"
          className="flex items-center gap-3 self-center rounded-md py-1 lg:self-start"
          aria-label="Torna alla home del Metodo FESPA"
        >
          <LogoMark />
          <Wordmark subtitle="Metodo®" className="hidden lg:flex" />
        </Link>

        <div className="hidden max-w-lg lg:block">{isSignup ? <SignupAside /> : <AccessAside />}</div>

        <p className="hidden text-xs text-ink-3 lg:block">FESPA · area riservata a coach e clienti</p>
      </aside>

      <main
        className={cn(
          "flex items-start justify-center px-6 py-12 sm:items-center sm:px-10",
          FORM_PANEL[variant],
          "[view-transition-class:auth-form]",
          FORM_TRANSITION[variant],
          isSignup && "lg:order-1",
        )}
      >
        <div className="w-full max-w-[400px]">
          {/* Su mobile titolo, descrizione e link finali sono centrati; i campi del form restano allineati a sinistra. */}
          <h1 className="text-center font-serif text-[32px] leading-tight tracking-[-0.01em] text-ink lg:text-left">{title}</h1>
          <div className="mt-2 text-center text-[15px] text-pretty text-ink-2 lg:text-left">{description}</div>
          <div className="mt-8">{children}</div>
          {footer ? (
            <div className="mt-8 flex flex-col gap-2 text-center text-[13px] text-ink-3 lg:text-left">{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

/** Esito positivo di un form di accesso (es. "controlla la tua email"). */
export function AuthSuccess({ message }: { message: string }) {
  return (
    <p role="status" className="rounded-md bg-accent-soft px-4 py-3.5 text-sm text-pretty text-accent-strong">
      {message}
    </p>
  );
}

export function AuthFormError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md bg-rust-soft px-3.5 py-3 text-sm text-rust">
      {message}
    </p>
  );
}
