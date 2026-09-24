import { CalendarClock, MessageCircleHeart } from "lucide-react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/cn";

/*
 * Anteprime illustrative dell'area clienti, disegnate in HTML/CSS con gli stessi token dell'app.
 * Sono immagini decorative per chi usa uno screen reader: un'unica descrizione, contenuto nascosto.
 * Nomi e testi sono di esempio, non di clienti reali.
 */

function PhoneFrame({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative w-[280px] rounded-[2.4rem] bg-ink p-2 shadow-[0_30px_60px_-24px_rgb(31_29_26/0.45)] sm:w-[300px]",
        className,
      )}
    >
      <div aria-hidden="true" className="overflow-hidden rounded-[2rem] bg-paper">
        <div className="flex items-center justify-center pt-2.5">
          <span className="h-1.5 w-16 rounded-full bg-ink/15" />
        </div>
        {children}
      </div>
    </div>
  );
}

function PreviewHeader() {
  return (
    <div className="flex items-center justify-between px-5 pt-3">
      <LogoMark className="size-7 text-[15px]" />
      <span className="flex size-7 items-center justify-center rounded-full bg-avatar-3 font-serif text-[11px] text-ink">CM</span>
    </div>
  );
}

const SCORES = [
  { label: "Energia", value: 4 },
  { label: "Sonno", value: 4 },
  { label: "Stress", value: 2 },
] as const;

/** Home dell'area clienti: check-in inviato e risposta della coach. */
export function HomePreview({ className }: { className?: string }) {
  return (
    <PhoneFrame
      label="Anteprima dell'area clienti: check-in settimanale inviato e risposta della coach"
      className={className}
    >
      <PreviewHeader />
      <div className="px-5 pb-6 pt-5">
        <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-ink-3">La tua area</p>
        <p className="mt-1 font-serif text-[26px] leading-tight text-ink">Ciao, Chiara</p>
        <p className="mt-1 text-[11px] text-ink-2">Ti segue la tua coach FESPA.</p>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.75} />
          <div>
            <p className="text-[12px] font-medium text-ink">Check-in inviato</p>
            <p className="text-[10px] text-ink-3">Il prossimo, lunedì prossimo</p>
          </div>
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-ink">Lunedì 21 settembre</p>
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-medium text-accent-strong">Risposta ricevuta</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {SCORES.map((score) => (
              <span key={score.label} className="rounded-md bg-sunken px-1.5 py-1 text-[9px] text-ink-2">
                {score.label} <span className="font-semibold text-ink">{score.value}/5</span>
              </span>
            ))}
          </div>
          <div className="mt-3 border-l-2 border-accent pl-3">
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-accent-strong">Risposta della tua coach</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink">
              Che bella settimana, Chiara! Mercoledì proviamo a spostare l&apos;allenamento al mattino: ne parliamo al
              prossimo check-in.
            </p>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

const CHECKIN_QUESTIONS = [
  { question: "Com'è stata la tua energia?", selected: 4 },
  { question: "Come hai dormito?", selected: 3 },
  { question: "Quanto stress hai sentito?", selected: 2 },
] as const;

const SCALE = [1, 2, 3, 4, 5] as const;

/** Il check-in settimanale: poche domande con risposte a un tocco. */
export function CheckinPreview({ className }: { className?: string }) {
  return (
    <PhoneFrame label="Anteprima del check-in settimanale: domande con risposte da 1 a 5" className={className}>
      <PreviewHeader />
      <div className="px-5 pb-6 pt-5">
        <p className="font-serif text-[22px] leading-tight text-ink">Check-in settimanale</p>
        <p className="mt-1 text-[11px] text-ink-2">Bastano un paio di minuti.</p>
        <div className="mt-4 flex flex-col gap-3.5">
          {CHECKIN_QUESTIONS.map((item) => (
            <div key={item.question}>
              <p className="text-[11px] font-medium text-ink">{item.question}</p>
              <div className="mt-1.5 flex gap-1.5">
                {SCALE.map((value) => (
                  <span
                    key={value}
                    className={cn(
                      "flex h-7 flex-1 items-center justify-center rounded-md border text-[11px]",
                      value === item.selected ? "border-ink bg-ink text-on-ink" : "border-control/60 bg-surface text-ink",
                    )}
                  >
                    {value}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-md bg-ink py-2.5 text-center text-[12px] font-medium text-on-ink">Invia il check-in</div>
      </div>
    </PhoneFrame>
  );
}

/** Notifica flottante accanto all'anteprima (solo decorativa). */
export function ReplyToast({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex items-center gap-3 rounded-xl border border-line bg-surface/95 px-4 py-3 shadow-[0_18px_40px_-20px_rgb(31_29_26/0.35)]",
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft">
        <MessageCircleHeart className="size-4 text-accent-strong" strokeWidth={1.75} />
      </span>
      <span>
        <span className="block text-[13px] font-medium text-ink">Nuova risposta</span>
        <span className="block text-[12px] text-ink-3">dalla tua coach</span>
      </span>
    </div>
  );
}
