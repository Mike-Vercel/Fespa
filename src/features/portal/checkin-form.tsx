"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { describedBy, Field, Input, Textarea } from "@/components/ui/form-fields";
import type { FieldErrors } from "@/types/results";
import {
  CHECKIN_SCALE_MAX,
  CHECKIN_SCALE_MIN,
  CHECKIN_SCALES,
  clientCheckinInputSchema,
  MAX_CHECKIN_TEXT_LENGTH,
  MAX_WEEKLY_SESSIONS,
  type CheckinScaleKey,
} from "@/validation/checkin";
import { fieldErrorsOf } from "@/validation/field-errors";
import { submitCheckinAction } from "./actions";

const SCALE_HINTS: Record<CheckinScaleKey, string> = {
  energy: "1 = molto bassa · 5 = ottima",
  sleepQuality: "1 = pessimo · 5 = ottimo",
  stress: "1 = molto basso · 5 = molto alto",
  nutritionAdherence: "1 = per niente · 5 = completamente",
};

const SCALE_QUESTIONS: Record<CheckinScaleKey, string> = {
  energy: "Com'è stata la tua energia questa settimana?",
  sleepQuality: "Come hai dormito?",
  stress: "Quanto stress hai sentito?",
  nutritionAdherence: "Quanto hai seguito il piano alimentare concordato?",
};

const SCALE_OPTIONS = Array.from({ length: CHECKIN_SCALE_MAX - CHECKIN_SCALE_MIN + 1 }, (_, index) => {
  const value = CHECKIN_SCALE_MIN + index;
  return { value, label: String(value) };
});

type Scores = Record<CheckinScaleKey, number | null>;

export function CheckinForm({ coachName }: { coachName: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [scores, setScores] = useState<Scores>({ energy: null, sleepQuality: null, stress: null, nutritionAdherence: null });
  const [sessionsDone, setSessionsDone] = useState("");
  const [sessionsPlanned, setSessionsPlanned] = useState("");
  const [wins, setWins] = useState("");
  const [challenges, setChallenges] = useState("");
  const [questions, setQuestions] = useState("");

  function submit() {
    setFormError(null);
    const answers = {
      ...scores,
      trainingSessionsDone: sessionsDone === "" ? null : Number(sessionsDone),
      trainingSessionsPlanned: sessionsPlanned === "" ? null : Number(sessionsPlanned),
      wins,
      challenges,
      questionsForCoach: questions,
    };
    const parsed = clientCheckinInputSchema.safeParse(answers);
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      setFormError("Controlla i campi evidenziati: servono tutte le valutazioni e gli allenamenti.");
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = await submitCheckinAction(answers);
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        setFormError(result.error.message);
        return;
      }
      toast.success(coachName ? `Check-in inviato a ${coachName}` : "Check-in inviato");
      router.push("/area-cliente");
      router.refresh();
    });
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-10"
    >
      <section aria-labelledby="scores-title" className="flex flex-col gap-6">
        <h2 id="scores-title" className="font-serif text-xl text-ink">
          Come è andata
        </h2>
        {CHECKIN_SCALES.map((scale) => (
          <ChoiceGroup
            key={scale.key}
            name={scale.key}
            legend={SCALE_QUESTIONS[scale.key]}
            hint={SCALE_HINTS[scale.key]}
            options={SCALE_OPTIONS}
            value={scores[scale.key]}
            onChange={(value) => setScores((current) => ({ ...current, [scale.key]: value }))}
            errors={errors[scale.key]}
          />
        ))}
      </section>

      <section aria-labelledby="training-title" className="flex flex-col gap-5">
        <h2 id="training-title" className="font-serif text-xl text-ink">
          Allenamenti
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <Field id="sessions-done" label="Fatti" errors={errors.trainingSessionsDone}>
            <Input id="sessions-done" type="number" inputMode="numeric" min={0} max={MAX_WEEKLY_SESSIONS} value={sessionsDone} onChange={(event) => setSessionsDone(event.target.value)} {...describedBy("sessions-done", errors.trainingSessionsDone)} />
          </Field>
          <Field id="sessions-planned" label="Previsti" errors={errors.trainingSessionsPlanned}>
            <Input id="sessions-planned" type="number" inputMode="numeric" min={0} max={MAX_WEEKLY_SESSIONS} value={sessionsPlanned} onChange={(event) => setSessionsPlanned(event.target.value)} {...describedBy("sessions-planned", errors.trainingSessionsPlanned)} />
          </Field>
        </div>
      </section>

      <section aria-labelledby="notes-title" className="flex flex-col gap-5">
        <h2 id="notes-title" className="font-serif text-xl text-ink">
          Raccontaci la settimana
        </h2>
        <Field id="wins" label="Cosa è andato bene?" errors={errors.wins}>
          <Textarea id="wins" value={wins} onChange={(event) => setWins(event.target.value)} rows={3} maxLength={MAX_CHECKIN_TEXT_LENGTH} {...describedBy("wins", errors.wins)} />
        </Field>
        <Field id="challenges" label="Hai incontrato difficoltà?" errors={errors.challenges}>
          <Textarea id="challenges" value={challenges} onChange={(event) => setChallenges(event.target.value)} rows={3} maxLength={MAX_CHECKIN_TEXT_LENGTH} />
        </Field>
        <Field id="questions" label={coachName ? `Domande per ${coachName} (facoltative)` : "Domande per la tua coach (facoltative)"}>
          <Textarea id="questions" value={questions} onChange={(event) => setQuestions(event.target.value)} rows={3} maxLength={MAX_CHECKIN_TEXT_LENGTH} />
        </Field>
      </section>

      {formError ? (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-rust-soft px-3.5 py-3 text-sm text-rust">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {formError}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="primary" isLoading={isPending} className="h-11 px-6">
          Invia il check-in
        </Button>
      </div>
    </form>
  );
}
