import "server-only";
import type { PublicTrialSummaryOutput } from "@/server/ai/schemas/public-trial";
import type { EmailMessage } from "@/server/email";

/*
 * Email "Il tuo riepilogo FESPA" della Prova FESPA.
 * I testi arrivano dall'AI (influenzata da ciò che scrive il visitatore): sono sempre
 * trattati come testo semplice, con l'HTML neutralizzato e gli indirizzi web rimossi.
 * L'unico link è quello alla registrazione, costruito dal server.
 */

const SUBJECT = "Il tuo riepilogo FESPA";
const NOT_EMERGED = "Non è emerso dalla conversazione";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Niente link nei testi generati: nessuno può usare il riepilogo per far arrivare indirizzi altrui. */
function withoutLinks(text: string): string {
  return text
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[link rimosso]")
    .replace(/\b[\w.-]+\.(?:com|it|net|org|io|ly|me|info|biz|xyz)(?:\/\S*)?\b/gi, "[link rimosso]");
}

function clean(text: string): string {
  return withoutLinks(text.trim());
}

type Section = { title: string; body: string };

function sectionsOf(summary: PublicTrialSummaryOutput): Section[] {
  const sections: Section[] = [
    { title: "Cosa mi hai raccontato", body: summary.summary },
    { title: "La difficoltà principale", body: summary.mainChallenge },
    { title: "Il tuo obiettivo", body: summary.goal },
    { title: "Un primo passo possibile", body: summary.suggestedNextStep },
  ];
  return sections.filter((section) => section.body.trim() !== "" && section.body.trim() !== NOT_EMERGED).map((section) => ({ ...section, body: clean(section.body) }));
}

export function buildTrialSummaryEmail(options: {
  to: string;
  name: string;
  summary: PublicTrialSummaryOutput;
  signupUrl: string;
  idempotencyKey: string;
}): EmailMessage {
  const name = options.name.trim();
  const intro = clean(options.summary.emailIntro);
  const context = options.summary.relevantContext.map(clean).filter((item) => item !== "" && item !== NOT_EMERGED);
  const sections = sectionsOf(options.summary);
  const closing =
    "Questo è solo un primo punto di partenza. Per continuare a costruire il tuo percorso puoi creare gratuitamente il tuo account FESPA.";
  const disclaimer =
    "FESPA AI non fornisce diagnosi né indicazioni mediche o nutrizionali: per questo c'è il confronto con la tua coach e, quando serve, con un professionista sanitario. Hai ricevuto questa email perché l'hai richiesta al termine della prova su FESPA.";

  const text = [
    `Ciao ${name},`,
    "",
    "grazie per aver provato FESPA.",
    "",
    intro,
    "",
    ...sections.flatMap((section) => [`${section.title}: ${section.body}`, ""]),
    ...(context.length > 0 ? ["Contesto:", ...context.map((item) => `- ${item}`), ""] : []),
    closing,
    "",
    `CONTINUA CON FESPA → ${options.signupUrl}`,
    "",
    disclaimer,
  ].join("\n");

  const sectionHtml = sections
    .map(
      (section) => `
        <tr><td style="padding:0 0 18px">
          <p style="margin:0 0 4px;font:600 12px/1.4 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#6a4fe0">${escapeHtml(section.title)}</p>
          <p style="margin:0;font:16px/1.6 Arial,sans-serif;color:#2b2d3d">${escapeHtml(section.body)}</p>
        </td></tr>`,
    )
    .join("");
  const contextHtml =
    context.length > 0
      ? `<tr><td style="padding:0 0 18px">
          <p style="margin:0 0 4px;font:600 12px/1.4 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#6a4fe0">Contesto</p>
          <ul style="margin:0;padding:0 0 0 18px;font:16px/1.6 Arial,sans-serif;color:#2b2d3d">${context.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </td></tr>`
      : "";

  const html = `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${SUBJECT}</title></head>
<body style="margin:0;padding:0;background:#f6f3fb">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3fb;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
        <tr><td style="height:6px;background:linear-gradient(90deg,#2a4ff2,#8b4fe6,#c452d4);background-color:#6a4fe0"></td></tr>
        <tr><td style="padding:32px 32px 8px">
          <p style="margin:0 0 20px;font:700 14px/1 Arial,sans-serif;letter-spacing:.22em;color:#15172b">FESPA</p>
          <h1 style="margin:0 0 16px;font:400 28px/1.2 Georgia,serif;color:#15172b">Ciao ${escapeHtml(name)},</h1>
          <p style="margin:0 0 12px;font:16px/1.6 Arial,sans-serif;color:#2b2d3d">grazie per aver provato FESPA.</p>
          <p style="margin:0 0 24px;font:16px/1.6 Arial,sans-serif;color:#2b2d3d">${escapeHtml(intro)}</p>
        </td></tr>
        <tr><td style="padding:0 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sectionHtml}${contextHtml}</table></td></tr>
        <tr><td style="padding:8px 32px 32px">
          <p style="margin:0 0 24px;font:16px/1.6 Arial,sans-serif;color:#2b2d3d">${escapeHtml(closing)}</p>
          <a href="${escapeHtml(options.signupUrl)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:#11142b;color:#ffffff;font:600 14px/1 Arial,sans-serif;letter-spacing:.08em;text-decoration:none">CONTINUA CON FESPA →</a>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;border-top:1px solid #eeeaf5">
          <p style="margin:0;font:12px/1.6 Arial,sans-serif;color:#6b6d7b">${escapeHtml(disclaimer)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { to: options.to, subject: SUBJECT, html, text, idempotencyKey: options.idempotencyKey };
}
