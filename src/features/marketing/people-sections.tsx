import { ArrowRight, Quote } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { OFFICIAL_SITE_URL, SIGNUP_PATH, TEAM, TESTIMONIALS } from "./content";
import { Container, CTA_PRIMARY, ExternalLink, SectionIntro } from "./primitives";

export function TeamSection() {
  return (
    <section aria-labelledby="team-title" id="team" className="scroll-mt-20 py-20 lg:py-28">
      <Container>
        <SectionIntro
          id="team-title"
          eyebrow="Chi ti segue"
          title="Dietro ogni percorso ci sono persone vere."
          description="La dottoressa che ha ideato il metodo e un team di coach che ogni giorno accompagna le donne nel loro cambiamento."
        />
        <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((member) => {
            const displayName = member.title ? `${member.title} ${member.name}` : member.name;
            return (
              <li key={member.name} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5">
                <Avatar name={member.name} size="lg" />
                <div className="min-w-0">
                  <p className="font-medium text-ink">{displayName}</p>
                  <p className="text-[14px] text-ink-3">{member.role}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-[16px] text-ink-2">
          <span className="font-serif text-[20px] italic text-accent-strong">+ altri 50 collaboratori</span> al tuo fianco,
          ogni giorno.
        </p>
      </Container>
    </section>
  );
}

/** Prova sociale subito prima della richiesta di azione. */
export function TestimonialsSection() {
  return (
    <section aria-labelledby="testimonianze-title" id="testimonianze" className="scroll-mt-20 bg-sidebar py-20 lg:py-28">
      <Container>
        <SectionIntro
          id="testimonianze-title"
          eyebrow="Testimonianze"
          title="Cosa dicono le donne che l'hanno scelto."
        />

        <ul className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3">
          {TESTIMONIALS.map((testimonial) => (
            <li key={testimonial.author} className="mb-5 break-inside-avoid">
              <figure className="rounded-2xl border border-line bg-surface p-6">
                <Quote aria-hidden="true" className="size-6 text-accent" strokeWidth={1.5} />
                <blockquote className="mt-3 font-serif text-[20px] leading-snug text-ink text-pretty">
                  <p>{testimonial.quote}</p>
                </blockquote>
                <figcaption className="mt-4 text-[14px] font-medium text-ink-2">{testimonial.author}</figcaption>
              </figure>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-6 border-t border-line-strong pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[14px] text-ink-3">
              Testimonianze pubblicate sul sito ufficiale del Metodo FESPA. I risultati variano da persona a persona.
            </p>
            <ExternalLink
              href={`${OFFICIAL_SITE_URL}/recensioni`}
              className="mt-1 min-h-11 text-[14px] font-medium text-ink underline underline-offset-4"
            >
              Leggi tutte le recensioni
            </ExternalLink>
          </div>
          <Link href={SIGNUP_PATH} className={CTA_PRIMARY}>
            Voglio iniziare anch&apos;io
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
