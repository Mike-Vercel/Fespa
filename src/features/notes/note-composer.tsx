"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-fields";
import { cn } from "@/lib/cn";
import { NOTE_MAX_LENGTH } from "@/validation/notes";
import { createNoteAction } from "./actions";

export function NoteComposer({ clientId }: { clientId: string }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isTooLong = content.length > NOTE_MAX_LENGTH;

  function saveNote() {
    startTransition(async () => {
      const result = await createNoteAction(clientId, content);
      if (result.ok) {
        setContent("");
        setError(null);
        toast.success("Nota salvata");
      } else {
        setError(result.error.fieldErrors?.content?.[0] ?? result.error.message);
      }
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        saveNote();
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="new-note" className="text-[13px] font-medium text-ink">
        Nuova nota
      </label>
      <Textarea
        id="new-note"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Osservazioni, accordi presi, cose da ricordare…"
        rows={3}
        aria-invalid={error || isTooLong ? true : undefined}
        aria-describedby="new-note-help"
      />
      <div className="flex items-center justify-between gap-3">
        <p id="new-note-help" className={cn("text-xs", error || isTooLong ? "text-rust" : "text-ink-3")}>
          {error ?? `${content.length}/${NOTE_MAX_LENGTH} · Visibile a chi segue questa cliente`}
        </p>
        <Button type="submit" variant="primary" size="sm" isLoading={isPending} disabled={!content.trim() || isTooLong}>
          Salva nota
        </Button>
      </div>
    </form>
  );
}
