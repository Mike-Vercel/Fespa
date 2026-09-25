import { Heart } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { TEAM } from "./content";
import { MotionNoScript, Reveal } from "./reveal";
import { TeamGrid, TeamItem, TeamPhoto } from "./team-motion";

/*
 * "Chi ti segue": le persone del team, protagoniste.
 * Le fotografie (sfondo bianco) escono dal bordo superiore della propria card: il bianco sparisce
 * con mix-blend-mode: multiply (vedi .team-card in globals.css), quindi nessun ritaglio sulla persona.
 * Desktop: quattro card in fila. Tablet: griglia 2×2. Mobile: carosello con scorrimento a scatto,
 * la card successiva si intravede. La fondatrice è sempre la prima.
 * Titoli in serif editoriale (font-editorial): questa sezione non usa il carattere display di prova.
 */

type Member = (typeof TEAM)[number];

const MUTED = "text-[#5d5f6e]";

function TeamMemberCard({ member, featured }: { member: Member; featured: boolean }) {
  const displayName = member.title ? `${member.title} ${member.name}` : member.name;
  return (
    <TeamItem
      className={cn("team-card group relative", featured && "team-card--featured")}
      style={{ "--photo-y": member.photoY } as CSSProperties}
    >
      <div aria-hidden="true" className="team-card__frame absolute inset-x-0 bottom-0" />
      <div aria-hidden="true" className="team-card__glow absolute" />
      <svg aria-hidden="true" viewBox="0 0 40 40" className="team-card__spark absolute size-9" fill="none" strokeLinecap="round" strokeWidth={3}>
        <path d="M14 6 10 16" stroke="#e86fc4" />
        <path d="M34 14 22 21" stroke="#c457d2" />
      </svg>

      <TeamPhoto className="team-card__photo relative">
        <Image
          src={member.photo}
          alt={`Ritratto di ${displayName}, ${member.role.charAt(0).toLowerCase()}${member.role.slice(1)}`}
          fill
          quality={90}
          sizes="(min-width: 1200px) 22vw, (min-width: 768px) 44vw, 80vw"
          className="object-cover [object-position:50%_var(--photo-y)]"
        />
      </TeamPhoto>

      <div className="team-card__info relative mx-2.5 -mt-12 mb-2.5 rounded-[1.15rem] bg-white px-5 pb-4 pt-4 min-[1200px]:px-[1.3vw]">
        <h3 className="font-editorial text-[1.45rem] font-medium leading-tight tracking-[-0.01em] text-[#15172b] min-[1200px]:text-[clamp(1.35rem,1.5vw,1.75rem)]">
          {displayName}
        </h3>
        <p className={cn("mt-1 text-[14px] leading-snug min-[1200px]:text-[clamp(0.88rem,0.95vw,1.02rem)]", MUTED)}>{member.role}</p>
      </div>
    </TeamItem>
  );
}

export function TeamSection() {
  return (
    <section aria-labelledby="team-title" id="team" className="relative isolate scroll-mt-20 overflow-hidden bg-[#fcfaf8]">
      <MotionNoScript />
      {/* Nastri FESPA leggerissimi agli angoli. */}
      <div aria-hidden="true" className="team-ribbons absolute inset-0 -z-10">
        <Image src="/images/homepage/section_2/sfondo.svg" alt="" fill unoptimized sizes="100vw" className="object-cover" />
      </div>
      {/* In fondo sfuma nel bianco da cui partono le Testimonianze. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-[5] h-[clamp(7rem,14vw,14rem)] bg-gradient-to-b from-transparent to-white" />

      <div className="mx-auto max-w-[1760px] px-4 py-16 min-[640px]:px-6 min-[1200px]:px-[5.5vw] min-[1200px]:py-[5vw]">
        <div className="relative min-[1200px]:px-[5vw]">
          <Reveal>
            <p className={cn("text-[13px] font-medium uppercase tracking-[0.26em] min-[1200px]:text-[clamp(0.8rem,0.9vw,0.98rem)]", MUTED)}>Chi ti segue</p>
            <h2
              id="team-title"
              className="font-editorial mt-4 text-[clamp(2.4rem,10.5vw,3.8rem)] font-medium leading-[1] tracking-[-0.02em] text-[#15172b] min-[1200px]:text-[clamp(3.4rem,4.2vw,5.4rem)]"
            >
              <span className="block">Dietro ogni percorso</span>{" "}
              <em className="fespa-gradient-text block">ci sono persone vere</em>
            </h2>
            <p className={cn("mt-5 max-w-[46rem] text-[16.5px] leading-relaxed min-[1200px]:text-[clamp(1.02rem,1.2vw,1.3rem)]", MUTED)}>
              La dottoressa che ha ideato il metodo e un team di coach che ogni giorno accompagna le donne nel loro cambiamento.
            </p>
          </Reveal>

          {/* Nota "scritta a mano" con la freccia verso le persone (solo desktop). */}
          <Reveal delay={0.5} y={8} className="team-note absolute right-0 top-[18%] hidden min-[1200px]:block">
            <p className="flex items-start gap-3 font-editorial text-[clamp(1.25rem,1.55vw,1.7rem)] italic leading-snug text-[#4b3fc4]">
              <Heart aria-hidden="true" className="mt-1 size-7 shrink-0 text-[#e05fb4]" strokeWidth={2} />
              <span>
                Un team reale,
                <br />
                al tuo fianco ogni giorno.
              </span>
            </p>
            <svg aria-hidden="true" viewBox="0 0 140 90" className="team-note__arrow ml-[-2.5rem] mt-2 h-[5.5rem] w-[8.5rem]" fill="none">
              <path d="M128 8C82 8 46 30 18 74" stroke="#8a6cf0" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M14 56 17 76 36 70" stroke="#8a6cf0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Reveal>
        </div>

        <TeamGrid className="team-grid mt-6 min-[768px]:mt-12 min-[1200px]:mt-[3.4vw]">
          {TEAM.map((member, index) => (
            <TeamMemberCard key={member.name} member={member} featured={index === 0} />
          ))}
        </TeamGrid>

        <Reveal delay={0.3} y={10} className="mt-10 min-[1200px]:mt-[2.6vw]">
          <p className="text-[17px] text-[#3b3d4f] min-[1200px]:text-[clamp(1.05rem,1.25vw,1.35rem)]">
            <span className="font-editorial fespa-gradient-text inline-block text-[1.35em] italic">+ altri 50 collaboratori</span> al tuo fianco, ogni
            giorno.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
