import { Check } from "lucide-react";
import { METHOD_PILLARS, WITHOUT_LIST } from "./content";
import { Container, SectionIntro } from "./primitives";

export function MethodSection() {
  return (
    <section aria-labelledby="metodo-title" id="metodo" className="scroll-mt-20 py-20 lg:py-28">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">
          <div>
            <SectionIntro
              id="metodo-title"
              eyebrow="Il metodo"
              title="Non è una dieta. È un nuovo modo di stare bene."
              description="Il Metodo FESPA® nasce per offrire alle donne un modo diverso di rimettersi in forma: basato su principi scientifici, educazione alimentare e strategie efficaci, senza rinunce estreme."
            />
            <blockquote className="mt-10 border-l-2 border-accent pl-5">
              <p className="font-serif text-[26px] leading-snug text-ink italic text-balance">
                “Il vero cambiamento parte dalla testa e dura nel tempo.”
              </p>
              <footer className="mt-2 text-sm text-ink-3">Il principio del Metodo FESPA</footer>
            </blockquote>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h3 className="font-serif text-[22px] text-ink">Pensato per la tua vita reale</h3>
            <ul className="mt-5 flex flex-col gap-3.5">
              {WITHOUT_LIST.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[16px] text-ink">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                    <Check aria-hidden="true" className="size-3.5 text-accent-strong" strokeWidth={2.5} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-line pt-5 text-[15px] text-ink-2">
              Il primo percorso di ri-educazione alimentare e online coaching in Italia: non una dieta, ma un cambio di
              paradigma.
            </p>
          </div>
        </div>

        <ul className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {METHOD_PILLARS.map((pillar, index) => (
            <li key={pillar.title} className="bg-paper p-6 sm:p-8">
              <p className="tabular font-serif text-[15px] text-accent-strong">0{index + 1}</p>
              <h3 className="mt-3 font-serif text-[24px] leading-tight text-ink">{pillar.title}</h3>
              <p className="mt-2 text-[16px] leading-relaxed text-ink-2">{pillar.description}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
