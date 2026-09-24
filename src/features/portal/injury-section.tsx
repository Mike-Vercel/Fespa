"use client";

import { ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Field, Textarea } from "@/components/ui/form-fields";
import { QUESTIONS_SOURCE_LABELS } from "@/lib/labels";
import type { HealthFollowup, HealthQuestionsSource } from "@/types/domain";
import type { FieldErrors } from "@/types/results";
import { FOLLOWUP_ANSWER_MAX_LENGTH, INJURY_DESCRIPTION_MAX_LENGTH } from "@/validation/onboarding";
import { generateInjuryQuestionsAction } from "./actions";

export type InjuryState = {
  consent: boolean;
  hasInjuries: boolean | null;
  description: string;
  followup: HealthFollowup[];
  questionsSource: HealthQuestionsSource | null;
};

type InjurySectionProps = {
  value: InjuryState;
  onChange: (next: InjuryState) => void;
  errors: FieldErrors;
};

/**
 * Sezione facoltativa su infortuni e traumi fisici (dati relativi alla salute):
 * richiede un consenso esplicito separato; se la persona segnala qualcosa, arrivano
 * 2-3 domande di approfondimento non cliniche (AI, oppure standard se l'AI non è disponibile).
 */
export function InjurySection({ value, onChange, errors }: InjurySectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const update = (patch: Partial<InjuryState>) => onChange({ ...value, ...patch });

  async function generateQuestions() {
    setIsGenerating(true);
    setGenerationError(null);
    const result = await generateInjuryQuestionsAction(value.description);
    setIsGenerating(false);
    if (!result.ok) {
      setGenerationError(result.error.fieldErrors?.description?.[0] ?? result.error.message);
      return;
    }
    update({
      followup: result.data.questions.map((question) => ({ question, answer: "" })),
      questionsSource: result.data.source,
    });
  }

  return (
    <section aria-labelledby="injury-title" className="flex flex-col gap-5">
      <div>
        <h2 id="injury-title" className="font-serif text-xl text-ink">
          Infortuni e traumi <span className="text-base text-ink-3">(facoltativo)</span>
        </h2>
        <p className="mt-1 text-sm text-pretty text-ink-2">
          Se hai avuto infortuni o traumi fisici, saperlo aiuta la tua coach a proporti allenamenti sicuri. Non è una
          valutazione medica: per diagnosi e cure fai sempre riferimento al tuo medico.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-md border border-line bg-surface p-4 text-sm text-ink-2">
        <input
          type="checkbox"
          checked={value.consent}
          onChange={(event) => update({ consent: event.target.checked })}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
        />
        <span>
          <ShieldCheck aria-hidden="true" className="mr-1 inline size-4 text-accent" strokeWidth={1.75} />
          Voglio condividere informazioni su infortuni, traumi o condizioni fisiche. Acconsento al loro trattamento per
          impostare il mio percorso: saranno visibili solo alla mia coach e all&apos;amministrazione, e un assistente AI
          potrà usarle per suggerirmi qualche domanda di approfondimento.
        </span>
      </label>

      {value.consent ? (
        <div className="flex flex-col gap-5 border-l-2 border-line pl-4">
          <ChoiceGroup
            name="hasInjuries"
            legend="Hai avuto infortuni, traumi fisici o condizioni fisiche che la coach dovrebbe conoscere?"
            options={[
              { value: true, label: "Sì" },
              { value: false, label: "No" },
            ]}
            value={value.hasInjuries}
            onChange={(hasInjuries) => update({ hasInjuries, ...(hasInjuries ? {} : { followup: [], questionsSource: null }) })}
            errors={errors.hasInjuries}
          />

          {value.hasInjuries ? (
            <>
              <Field id="injury-description" label="Raccontaci brevemente" errors={errors.description} hint="Es. distorsione alla caviglia due anni fa, a volte fastidio correndo.">
                <Textarea
                  id="injury-description"
                  value={value.description}
                  onChange={(event) => update({ description: event.target.value })}
                  maxLength={INJURY_DESCRIPTION_MAX_LENGTH}
                  rows={3}
                />
              </Field>

              {value.followup.length === 0 ? (
                <div className="flex flex-col gap-2">
                  <div>
                    <Button
                      variant="ai"
                      onClick={generateQuestions}
                      isLoading={isGenerating}
                      disabled={value.description.trim().length < 3}
                      icon={<Sparkles aria-hidden="true" className="size-4" strokeWidth={1.75} />}
                    >
                      Continua con qualche domanda
                    </Button>
                  </div>
                  {generationError ? <p className="text-xs font-medium text-rust">{generationError}</p> : null}
                </div>
              ) : (
                <div className="flex flex-col gap-4" aria-live="polite">
                  {value.questionsSource ? (
                    <p className="flex items-center gap-1.5 text-xs text-ink-3">
                      <Sparkles aria-hidden="true" className="size-3.5" strokeWidth={2} />
                      {QUESTIONS_SOURCE_LABELS[value.questionsSource]}
                    </p>
                  ) : null}
                  {value.followup.map((item, index) => (
                    <Field key={item.question} id={`followup-${index}`} label={item.question}>
                      <Textarea
                        id={`followup-${index}`}
                        value={item.answer}
                        rows={2}
                        maxLength={FOLLOWUP_ANSWER_MAX_LENGTH}
                        onChange={(event) =>
                          update({
                            followup: value.followup.map((entry, position) =>
                              position === index ? { ...entry, answer: event.target.value } : entry,
                            ),
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
