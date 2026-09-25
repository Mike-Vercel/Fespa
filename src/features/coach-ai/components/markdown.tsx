import { CircleAlert, Dumbbell, Lightbulb, ListChecks, ShieldCheck, Sparkles, Target, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Markdown MINIMO per le risposte di Coach AI, reso come elementi React (niente HTML iniettato):
 * titoli, paragrafi, elenchi puntati e numerati, grassetto, corsivo, codice, citazioni, separatori.
 * I link sono ammessi solo verso pagine interne dell'app: un link esterno scritto dal modello
 * (magari copiato da un testo malevolo) resta testo semplice.
 */

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "rule" };

const HEADING = /^(#{1,4})\s+(.+)$/;
const BULLET = /^\s*[-*•]\s+(.+)$/;
const NUMBERED = /^\s*\d{1,3}[.)]\s+(.+)$/;
const QUOTE = /^>\s?(.*)$/;
const RULE = /^(-{3,}|\*{3,}|_{3,})\s*$/;

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) blocks.push({ kind: "paragraph", lines: paragraph });
    paragraph = [];
  };

  for (const rawLine of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    if (line.trim() === "") {
      flushParagraph();
      continue;
    }
    const heading = HEADING.exec(line);
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    const quote = QUOTE.exec(line);
    const last = blocks.at(-1);

    if (RULE.test(line)) {
      flushParagraph();
      blocks.push({ kind: "rule" });
    } else if (heading) {
      flushParagraph();
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
    } else if (bullet || numbered) {
      const continuesList = paragraph.length === 0 && last?.kind === "list";
      flushParagraph();
      const ordered = numbered !== null && bullet === null;
      const text = (bullet ?? numbered)?.[1] ?? "";
      if (continuesList && last.kind === "list" && last.ordered === ordered) last.items.push(text);
      else blocks.push({ kind: "list", ordered, items: [text] });
    } else if (quote) {
      const continuesQuote = paragraph.length === 0 && last?.kind === "quote";
      flushParagraph();
      if (continuesQuote && last.kind === "quote") last.lines.push(quote[1]);
      else blocks.push({ kind: "quote", lines: [quote[1]] });
    } else if (last?.kind === "list" && paragraph.length === 0 && /^\s{2,}\S/.test(rawLine)) {
      // Riga rientrata: continua l'ultima voce dell'elenco.
      last.items[last.items.length - 1] += ` ${line.trim()}`;
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();
  return blocks;
}

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (/^(\*\*|__).+\1$/.test(part)) return <strong key={key} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
    if (/^`.+`$/.test(part)) return <code key={key} className="rounded bg-sunken px-1 py-0.5 text-[0.92em]">{part.slice(1, -1)}</code>;
    if (/^[*_].+[*_]$/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      // Solo percorsi interni (niente "//dominio" né schemi come javascript:).
      return href.startsWith("/") && !href.startsWith("//") ? (
        <Link key={key} href={href} className="font-medium text-brand underline-offset-4 hover:underline">
          {label}
        </Link>
      ) : (
        <Fragment key={key}>{label}</Fragment>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

/** Icona decorativa per i titoli di sezione, scelta dalle parole del titolo. */
const HEADING_ICONS: Array<[RegExp, LucideIcon, string]> = [
  [/obiettiv/i, Target, "text-brand-violet"],
  [/piano|allenament|settiman|giorno|esercizi/i, Dumbbell, "text-urgent"],
  [/attenzion|rischi|segnal|important/i, CircleAlert, "text-warning"],
  [/consigl|strategi|idee|suggeriment/i, Lightbulb, "text-kpi-orange-ink"],
  [/riepilog|sintesi|punti|priorit/i, ListChecks, "text-info"],
  [/sicurezza|limiti/i, ShieldCheck, "text-brand"],
];

function headingIcon(text: string): { Icon: LucideIcon; tone: string } {
  const match = HEADING_ICONS.find(([pattern]) => pattern.test(text));
  return match ? { Icon: match[1], tone: match[2] } : { Icon: Sparkles, tone: "text-brand-violet" };
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className={cn("flex flex-col gap-3 text-[15px] leading-relaxed text-ink-2", className)}>
      {blocks.map((block, index) => {
        const key = `b${index}`;
        switch (block.kind) {
          case "heading": {
            const { Icon, tone } = headingIcon(block.text);
            const HeadingTag = block.level <= 2 ? "h3" : "h4";
            return (
              <HeadingTag
                key={key}
                className={cn(
                  "flex items-center gap-2.5 font-semibold text-ink",
                  block.level <= 2 ? "mt-2 text-[16px] first:mt-0" : "mt-1 text-[15px]",
                )}
              >
                {block.level <= 2 ? <Icon aria-hidden="true" className={cn("size-[18px] shrink-0", tone)} strokeWidth={1.9} /> : null}
                <span>{renderInline(block.text, key)}</span>
              </HeadingTag>
            );
          }
          case "paragraph":
            return (
              <p key={key} className="text-pretty">
                {block.lines.map((line, lineIndex) => (
                  <Fragment key={`${key}-${lineIndex}`}>
                    {lineIndex > 0 ? <br /> : null}
                    {renderInline(line, `${key}-${lineIndex}`)}
                  </Fragment>
                ))}
              </p>
            );
          case "list": {
            const ListTag = block.ordered ? "ol" : "ul";
            return (
              <ListTag key={key} className={cn("flex flex-col gap-1.5 pl-1", block.ordered && "list-decimal pl-6 marker:text-ink-3")}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`} className={cn("text-pretty", !block.ordered && "flex gap-2.5")}>
                    {block.ordered ? null : <span aria-hidden="true" className="mt-[0.62em] size-1.5 shrink-0 rounded-full bg-brand-violet/60" />}
                    <span className="min-w-0">{renderInline(item, `${key}-${itemIndex}`)}</span>
                  </li>
                ))}
              </ListTag>
            );
          }
          case "quote":
            return (
              <blockquote key={key} className="border-l-2 border-brand/30 pl-3 text-ink-2">
                {block.lines.map((line, lineIndex) => (
                  <Fragment key={`${key}-${lineIndex}`}>
                    {lineIndex > 0 ? <br /> : null}
                    {renderInline(line, `${key}-${lineIndex}`)}
                  </Fragment>
                ))}
              </blockquote>
            );
          case "rule":
            return <hr key={key} className="my-1 border-line/80" />;
        }
      })}
    </div>
  );
}
