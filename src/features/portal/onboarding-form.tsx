"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { describedBy, Field, Input, Textarea } from "@/components/ui/form-fields";
import { CONTACT_CHANNEL_LABELS, EXPERIENCE_LEVEL_LABELS } from "@/lib/labels";
import { CONTACT_CHANNELS, EXPERIENCE_LEVELS, type ClientPersonalProfile, type ContactChannel, type ExperienceLevel, type HealthProfile } from "@/types/domain";
import type { FieldErrors } from "@/types/results";
import { fieldErrorsByPath } from "@/validation/field-errors";
import { NOTES_FOR_COACH_MAX_LENGTH, onboardingSubmissionSchema } from "@/validation/onboarding";
import { saveOnboardingAction } from "./actions";
import { InjurySection, type InjuryState } from "./injury-section";

type ProfileState = {
  fullName: string;
  birthDate: string;
  phone: string;
  preferredContact: ContactChannel | null;
  goal: string;
  experienceLevel: ExperienceLevel | null;
  weeklyAvailability: number | null;
  notesForCoach: string;
  privacyConsent: boolean;
};

type OnboardingFormProps = {
  mode: "create" | "edit";
  initialProfile: Partial<ClientPersonalProfile> & { fullName: string };
  initialHealth: HealthProfile | null;
};

const DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((days) => ({ value: days, label: String(days) }));

/** Gli errori di validazione annidati (profile.x / health.x) diventano errori per campo. */
function splitErrors(errors: FieldErrors): { profile: FieldErrors; health: FieldErrors } {
  const profile: FieldErrors = {};
  const health: FieldErrors = {};
  for (const [path, messages] of Object.entries(errors)) {
    const [group, field] = path.split(".");
    if (group === "health" && field) health[field] = messages;
    else profile[field ?? group] = messages;
  }
  return { profile, health };
}

export function OnboardingForm({ mode, initialProfile, initialHealth }: OnboardingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ profile: FieldErrors; health: FieldErrors }>({ profile: {}, health: {} });
  const [profile, setProfile] = useState<ProfileState>({
    fullName: initialProfile.fullName,
    birthDate: initialProfile.birthDate ?? "",
    phone: initialProfile.phone ?? "",
    preferredContact: initialProfile.preferredContact ?? null,
    goal: initialProfile.goal ?? "",
    experienceLevel: initialProfile.experienceLevel ?? null,
    weeklyAvailability: initialProfile.weeklyAvailability ?? null,
    notesForCoach: initialProfile.notesForCoach ?? "",
    privacyConsent: mode === "edit",
  });
  const [injury, setInjury] = useState<InjuryState>({
    consent: initialHealth !== null,
    hasInjuries: initialHealth?.hasInjuries ?? null,
    description: initialHealth?.description ?? "",
    followup: initialHealth?.followup ?? [],
    questionsSource: initialHealth?.questionsSource ?? null,
  });

  const update = (patch: Partial<ProfileState>) => setProfile((current) => ({ ...current, ...patch }));

  /** Oggetto grezzo dal form: la validazione (qui per la UX e sul server per sicurezza) decide se è accettabile. */
  function buildSubmission() {
    return {
      profile: {
        ...profile,
        preferredContact: profile.preferredContact ?? undefined,
        experienceLevel: profile.experienceLevel ?? undefined,
        weeklyAvailability: profile.weeklyAvailability ?? undefined,
        privacyConsent: profile.privacyConsent,
      },
      health: injury.consent
        ? {
            hasInjuries: injury.hasInjuries ?? false,
            description: injury.hasInjuries ? injury.description : undefined,
            followup: injury.hasInjuries ? injury.followup : [],
            questionsSource: injury.hasInjuries ? injury.questionsSource : null,
          }
        : null,
    };
  }

  function submit() {
    setFormError(null);
    const submission = buildSubmission();
    const parsed = onboardingSubmissionSchema.safeParse(submission);
    if (!parsed.success) {
      setErrors(splitErrors(fieldErrorsByPath(parsed.error)));
      setFormError("Controlla i campi evidenziati.");
      return;
    }
    if (injury.consent && injury.hasInjuries === null) {
      setErrors({ profile: {}, health: { hasInjuries: ["Rispondi sì o no, oppure togli la spunta al consenso."] } });
      return;
    }
    setErrors({ profile: {}, health: {} });

    startTransition(async () => {
      const result = await saveOnboardingAction(submission);
      if (!result.ok) {
        setErrors(splitErrors(result.error.fieldErrors ?? {}));
        setFormError(result.error.message);
        return;
      }
      if (mode === "edit") {
        toast.success("Dati aggiornati");
        router.refresh();
      } else {
        router.push("/area-cliente");
        router.refresh();
      }
    });
  }

  const profileErrors = errors.profile;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-12"
    >
      <section aria-labelledby="personal-title" className="flex flex-col gap-5">
        <h2 id="personal-title" className="font-serif text-xl text-ink">
          I tuoi dati
        </h2>
        <Field id="fullName" label="Nome e cognome" errors={profileErrors.fullName}>
          <Input id="fullName" value={profile.fullName} onChange={(event) => update({ fullName: event.target.value })} autoComplete="name" {...describedBy("fullName", profileErrors.fullName)} />
        </Field>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="birthDate" label="Data di nascita" errors={profileErrors.birthDate}>
            <Input id="birthDate" type="date" value={profile.birthDate} onChange={(event) => update({ birthDate: event.target.value })} autoComplete="bday" {...describedBy("birthDate", profileErrors.birthDate)} />
          </Field>
          <Field id="phone" label="Telefono (facoltativo)" errors={profileErrors.phone}>
            <Input id="phone" type="tel" inputMode="tel" value={profile.phone} onChange={(event) => update({ phone: event.target.value })} autoComplete="tel" {...describedBy("phone", profileErrors.phone)} />
          </Field>
        </div>
        <ChoiceGroup
          name="preferredContact"
          legend="Come preferisci essere contattata o contattato?"
          options={CONTACT_CHANNELS.map((channel) => ({ value: channel, label: CONTACT_CHANNEL_LABELS[channel] }))}
          value={profile.preferredContact}
          onChange={(preferredContact) => update({ preferredContact })}
          errors={profileErrors.preferredContact}
        />
      </section>

      <section aria-labelledby="journey-title" className="flex flex-col gap-5">
        <h2 id="journey-title" className="font-serif text-xl text-ink">
          Il tuo percorso
        </h2>
        <Field id="goal" label="Qual è il tuo obiettivo?" errors={profileErrors.goal} hint="Es. ritrovare energia, allenarmi con costanza, preparare una gara.">
          <Textarea id="goal" value={profile.goal} onChange={(event) => update({ goal: event.target.value })} rows={2} maxLength={500} {...describedBy("goal", profileErrors.goal, true)} />
        </Field>
        <ChoiceGroup
          name="experienceLevel"
          legend="Esperienza con l'allenamento"
          variant="cards"
          options={EXPERIENCE_LEVELS.map((level) => ({ value: level, ...EXPERIENCE_LEVEL_LABELS[level] }))}
          value={profile.experienceLevel}
          onChange={(experienceLevel) => update({ experienceLevel })}
          errors={profileErrors.experienceLevel}
        />
        <ChoiceGroup
          name="weeklyAvailability"
          legend="Quanti giorni a settimana puoi allenarti?"
          options={DAYS_OPTIONS}
          value={profile.weeklyAvailability}
          onChange={(weeklyAvailability) => update({ weeklyAvailability })}
          errors={profileErrors.weeklyAvailability}
        />
        <Field id="notesForCoach" label="Qualcosa che vuoi dire alla tua coach? (facoltativo)" errors={profileErrors.notesForCoach}>
          <Textarea id="notesForCoach" value={profile.notesForCoach} onChange={(event) => update({ notesForCoach: event.target.value })} rows={3} maxLength={NOTES_FOR_COACH_MAX_LENGTH} placeholder="Orari, impegni, preferenze…" />
        </Field>
      </section>

      <InjurySection value={injury} onChange={setInjury} errors={errors.health} />

      <section className="flex flex-col gap-4 border-t border-line pt-8">
        {mode === "create" ? (
          <label className="flex items-start gap-3 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={profile.privacyConsent}
              onChange={(event) => update({ privacyConsent: event.target.checked })}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
              aria-invalid={profileErrors.privacyConsent ? true : undefined}
              aria-describedby={profileErrors.privacyConsent ? "privacy-error" : undefined}
            />
            <span>
              Acconsento al trattamento dei miei dati personali da parte di FESPA per la gestione del mio percorso di
              coaching.
            </span>
          </label>
        ) : null}
        {profileErrors.privacyConsent ? (
          <p id="privacy-error" className="text-xs font-medium text-rust">
            {profileErrors.privacyConsent[0]}
          </p>
        ) : null}

        {formError ? (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-rust-soft px-3.5 py-3 text-sm text-rust">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {formError}
          </p>
        ) : null}

        <div>
          <Button type="submit" variant="primary" isLoading={isPending} className="h-11 px-6">
            {mode === "create" ? "Invia i miei dati" : "Salva le modifiche"}
          </Button>
        </div>
      </section>
    </form>
  );
}
