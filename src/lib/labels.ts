import type {
  AIConfidence,
  ClientApprovalStatus,
  ClientStatus,
  ContactChannel,
  ExperienceLevel,
  FollowupStatus,
  HealthQuestionsSource,
  UserRole,
} from "@/types/domain";

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, { label: string; description: string }> = {
  beginner: { label: "Principiante", description: "Sto iniziando ora o riprendo dopo molto tempo" },
  intermediate: { label: "Intermedio", description: "Mi alleno con una certa regolarità" },
  advanced: { label: "Avanzato", description: "Mi alleno con costanza da anni" },
};

export const CONTACT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  phone: "Telefonata",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  client: "Cliente",
  coach: "Coach",
  admin: "Amministrazione",
  super_admin: "Super admin",
};

export const APPROVAL_STATUS_LABELS: Record<ClientApprovalStatus, string> = {
  pending: "In attesa di approvazione",
  approved: "Approvata",
  rejected: "Non approvata",
};

export const QUESTIONS_SOURCE_LABELS: Record<HealthQuestionsSource, string> = {
  ai: "Domande generate con AI",
  mock: "Domande dimostrative (modalità demo, nessuna AI)",
  standard: "Domande standard",
};

/** Etichette italiane dei valori di dominio: un solo posto, usato da badge, filtri e select. */

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  onboarding: "In avvio",
  active: "Attiva",
  paused: "In pausa",
  completed: "Percorso concluso",
};

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  pending: "In programma",
  completed: "Completato",
  cancelled: "Annullato",
};

export const AI_CONFIDENCE_LABELS: Record<AIConfidence, string> = {
  low: "Bassa",
  medium: "Media",
  high: "Alta",
};
