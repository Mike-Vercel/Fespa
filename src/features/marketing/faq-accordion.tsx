"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/*
 * Accordion esclusivo delle domande frequenti: al massimo UNA risposta aperta.
 * Un solo stato (indice aperto o null): aprirne una chiude l'altra, ricliccarla la chiude.
 * Pulsanti veri (Tab, Invio e Spazio funzionano da soli), con aria-expanded e aria-controls.
 * L'apertura (altezza e dissolvenza) è in CSS: .faq-panel in globals.css.
 */

export type FaqEntry = { question: string; answer: string };

export function FaqAccordion({ items, className }: { items: ReadonlyArray<FaqEntry>; className?: string }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const baseId = useId();

  return (
    <ul className={cn("flex flex-col gap-3 min-[1024px]:gap-[1vw]", className)}>
      {items.map((item, index) => {
        const open = openFaq === index;
        const buttonId = `${baseId}-domanda-${index}`;
        const panelId = `${baseId}-risposta-${index}`;
        return (
          <li key={item.question} className="faq-item" data-open={open}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenFaq(open ? null : index)}
                className="faq-trigger flex min-h-16 w-full cursor-pointer items-center justify-between gap-5 px-5 py-4 text-left text-[16.5px] leading-snug min-[1024px]:min-h-[clamp(3.9rem,4vw,4.4rem)] min-[1024px]:px-[1.3vw] min-[1024px]:text-[clamp(1rem,1.18vw,1.3rem)]"
              >
                <span>{item.question}</span>
                <span aria-hidden="true" className="faq-icon" />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} className="faq-panel" data-open={open}>
              <div>
                <p className="px-5 pb-5 pr-12 text-[15.5px] leading-relaxed text-[#c9c5d4] min-[1024px]:px-[1.3vw] min-[1024px]:pb-[1.3vw] min-[1024px]:pr-[4vw] min-[1024px]:text-[clamp(0.95rem,1.05vw,1.15rem)]">
                  {item.answer}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
