import "server-only";
import { z } from "zod";
import { calendarDateIn } from "@/domain/dates";
import { canManageRoles, describeRoleChange } from "@/domain/roles";
import { matchesUserSearch } from "@/domain/user-search";
import { APPROVAL_STATUS_LABELS, ROLE_LABELS } from "@/lib/labels";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import type { RegisteredUser } from "@/server/repositories/client-accounts";
import { decideRegistration, getRegistrationsOverview } from "@/server/services/registrations";
import { changeUserRole, getUsersOverview } from "@/server/services/users";
import { USER_ROLES } from "@/types/domain";
import type { RegistrationReview } from "@/validation/registrations";
import { defineActionTool, defineReadTool, type AgentContext } from "./define";
import { ADMINS, SUPER_ADMINS, countLabel, idSchema, safeName, untrusted } from "./shared";

const MAX_USER_RESULTS = 10;

async function allUsers(context: AgentContext): Promise<RegisteredUser[]> {
  // Il service verifica il ruolo (solo amministrazione) prima di leggere.
  const overview = await getUsersOverview(context.auth);
  return overview.groups.flatMap((group) => group.users);
}

export const searchUsersTool = defineReadTool({
  name: "search_users",
  description:
    "Cerca tra gli account registrati (clienti, coach, amministrazione) per nome o email, eventualmente filtrando per ruolo. " +
    "Solo amministrazione. Usalo per identificare un utente prima di cambiarne il ruolo; 'ambiguous' è true con più corrispondenze.",
  inputSchema: z
    .object({
      query: z.string().trim().max(80).describe("Nome o email (anche parziale); stringa vuota per elencare"),
      role: z.enum(USER_ROLES).nullable().describe("Filtra per ruolo, null per tutti"),
    })
    .strict(),
  allowedRoles: ADMINS,
  auditTarget: "user",
  runningLabel: ({ query }) => (query ? `Sto cercando l'utente “${query.slice(0, 40)}”…` : "Sto leggendo gli utenti…"),
  run: async (context, { query, role }) => {
    const users = (await allUsers(context)).filter(
      (user) => matchesUserSearch(user, query) && (role === null || user.role === role),
    );
    return {
      data: {
        total: users.length,
        ambiguous: users.length > 1,
        users: users.slice(0, MAX_USER_RESULTS).map((user) => ({
          userId: user.id,
          fullName: safeName(user.fullName),
          email: user.email,
          role: user.role,
          roleLabel: ROLE_LABELS[user.role],
          isCurrentUser: user.id === context.auth.coach.id,
          assignedClientCount: user.assignedClientCount,
          clientRegistration: user.approvalStatus ? APPROVAL_STATUS_LABELS[user.approvalStatus] : null,
        })),
      },
      summary: users.length === 0 ? "Nessun utente trovato" : `${countLabel(users.length, "utente trovato", "utenti trovati")}`,
      links: [{ label: "Apri gli utenti registrati", href: "/admin/users" }],
    };
  },
});

export const changeUserRoleTool = defineActionTool({
  name: "change_user_role",
  description:
    "Cambia il ruolo di un utente (client, coach, admin, super_admin). Solo il super admin, mai sul proprio account. " +
    "Operazione ad alto rischio: richiede la conferma esplicita dell'utente. Trova l'userId con search_users.",
  inputSchema: z
    .object({
      userId: idSchema("Id dell'utente (da search_users)"),
      role: z.enum(USER_ROLES).describe("Nuovo ruolo"),
    })
    .strict(),
  risk: "high_risk",
  allowedRoles: SUPER_ADMINS,
  auditTarget: "user",
  runningLabel: () => "Sto preparando il cambio di ruolo…",
  prepare: async (context, { userId, role }) => {
    if (!canManageRoles(context.auth.coach.role)) {
      throw new ForbiddenError("Solo il super admin può cambiare i ruoli.");
    }
    if (userId === context.auth.coach.id) {
      throw new ValidationError({}, "Non puoi modificare il tuo ruolo: chiedilo a un altro super admin.");
    }
    const user = (await allUsers(context)).find((candidate) => candidate.id === userId);
    if (!user) throw new NotFoundError("Utente non trovato.");
    if (user.role === role) {
      throw new ValidationError({}, `${user.fullName} ha già il ruolo “${ROLE_LABELS[role]}”.`);
    }
    return {
      title: `Cambiare il ruolo di ${user.fullName}?`,
      fields: [
        { label: "Utente", value: user.fullName },
        { label: "Email", value: user.email },
        { label: "Ruolo", value: `${ROLE_LABELS[user.role]} → ${ROLE_LABELS[role]}` },
      ],
      warnings: describeRoleChange(user.role, role, {
        assignedClientCount: user.assignedClientCount,
        hasOpenRegistration: user.approvalStatus !== null && user.approvalStatus !== "approved",
      }),
      confirmLabel: "Conferma cambio ruolo",
      target: { type: "user", id: user.id, label: user.fullName },
      summaryForModel: `Cambio di ruolo di ${safeName(user.fullName)} in ${role} preparato: serve la conferma esplicita dell'utente.`,
    };
  },
  commit: async (context, { userId, role }) => {
    await changeUserRole(context.auth, { userId, role });
    return { message: `Ruolo aggiornato: ${ROLE_LABELS[role]}.`, link: { label: "Apri gli utenti registrati", href: "/admin/users" } };
  },
  auditSummary: ({ userId, role }) => ({ userId, role }),
});

export const getRegistrationsTool = defineReadTool({
  name: "get_registrations",
  description:
    "Iscrizioni delle nuove clienti in attesa di approvazione (o rifiutate), con le coach assegnabili. Solo amministrazione. " +
    "I dati sanitari non sono inclusi: l'amministrazione li valuta nella pagina Iscrizioni.",
  inputSchema: z.object({ status: z.enum(["pending", "rejected"]).describe("Quali iscrizioni") }).strict(),
  allowedRoles: ADMINS,
  auditTarget: "registration",
  runningLabel: () => "Sto controllando le iscrizioni…",
  run: async (context, { status }) => {
    const overview = await getRegistrationsOverview(context.auth);
    const registrations = status === "pending" ? overview.pending : overview.rejected;
    return {
      data: {
        registrations: registrations.map((registration) => ({
          clientId: registration.id,
          fullName: safeName(registration.profile.fullName),
          email: registration.profile.email,
          submittedOn: registration.profile.onboardingCompletedAt
            ? calendarDateIn(context.timezone, registration.profile.onboardingCompletedAt)
            : null,
          goal: untrusted(registration.profile.goal, 300),
          experienceLevel: registration.profile.experienceLevel,
          weeklyAvailability: registration.profile.weeklyAvailability,
          healthInformationOnFile: registration.health !== null,
        })),
        assignableCoaches: overview.staff.map((member) => ({ coachId: member.id, fullName: safeName(member.fullName), role: member.role })),
      },
      summary: `${countLabel(registrations.length, "iscrizione", "iscrizioni")} ${status === "pending" ? "da valutare" : "rifiutate"}`,
      links: [{ label: "Apri le iscrizioni", href: "/admin/registrations" }],
    };
  },
});

export const reviewRegistrationTool = defineActionTool({
  name: "review_registration",
  description:
    "Approva o rifiuta l'iscrizione di una nuova cliente; in approvazione si può assegnare una coach (coachId da get_registrations). " +
    "Solo amministrazione. Operazione ad alto rischio: richiede la conferma esplicita dell'utente.",
  inputSchema: z
    .object({
      clientId: idSchema("Id dell'iscrizione (clientId da get_registrations)"),
      decision: z.enum(["approved", "rejected"]).describe("Decisione"),
      coachId: idSchema("Coach da assegnare").nullable().describe("Coach da assegnare in approvazione, null per nessuna"),
    })
    .strict(),
  risk: "high_risk",
  allowedRoles: ADMINS,
  auditTarget: "registration",
  runningLabel: () => "Sto preparando la decisione sull'iscrizione…",
  prepare: async (context, { clientId, decision, coachId }) => {
    const overview = await getRegistrationsOverview(context.auth);
    const registration = [...overview.pending, ...overview.rejected].find((candidate) => candidate.id === clientId);
    if (!registration) throw new NotFoundError("Iscrizione non trovata o già approvata.");
    const coach = coachId ? overview.staff.find((member) => member.id === coachId) : null;
    if (coachId && !coach) throw new ValidationError({ coachId: ["Seleziona una coach valida."] });
    if (decision === "rejected" && coachId) throw new ValidationError({}, "Una coach si assegna solo approvando l'iscrizione.");

    const name = registration.profile.fullName;
    return {
      title: decision === "approved" ? `Approvare l'iscrizione di ${name}?` : `Rifiutare l'iscrizione di ${name}?`,
      fields: [
        { label: "Persona", value: name },
        ...(registration.profile.email ? [{ label: "Email", value: registration.profile.email }] : []),
        { label: "Decisione", value: decision === "approved" ? "Approvata" : "Non approvata" },
        ...(decision === "approved" ? [{ label: "Coach assegnata", value: coach?.fullName ?? "Nessuna (da assegnare dopo)" }] : []),
      ],
      warnings:
        decision === "approved"
          ? ["Diventerà una cliente operativa: comparirà nelle liste e potrà inviare check-in."]
          : ["La persona vedrà che la richiesta non è stata approvata. Potrai riportarla in attesa dalla pagina Iscrizioni."],
      confirmLabel: decision === "approved" ? "Conferma approvazione" : "Conferma rifiuto",
      target: { type: "registration", id: registration.id, label: name },
      summaryForModel: `Decisione sull'iscrizione di ${safeName(name)} preparata (${decision}): serve la conferma esplicita dell'utente.`,
    };
  },
  commit: async (context, { clientId, decision, coachId }) => {
    const review: RegistrationReview =
      decision === "approved" ? { clientId, decision, coachId: coachId ?? "" } : { clientId, decision };
    await decideRegistration(context.auth, review);
    return {
      message: decision === "approved" ? "Iscrizione approvata." : "Iscrizione rifiutata.",
      link: { label: "Apri le iscrizioni", href: "/admin/registrations" },
    };
  },
  auditSummary: ({ clientId, decision, coachId }) => ({ clientId, decision, coachId }),
});
