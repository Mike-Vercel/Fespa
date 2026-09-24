"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/form-fields";
import type { NoteItem } from "@/types/domain";
import { NOTE_MAX_LENGTH } from "@/validation/notes";
import { deleteNoteAction, updateNoteAction } from "./actions";

type NoteCardProps = {
  note: NoteItem;
  /** Data già formattata dal server (evita differenze di fuso tra server e browser). */
  createdLabel: string;
  wasEdited: boolean;
};

export function NoteCard({ note, createdLabel, wasEdited }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [isSaving, startSaving] = useTransition();

  function saveEdit() {
    startSaving(async () => {
      const result = await updateNoteAction(note.id, draft);
      if (result.ok) {
        setIsEditing(false);
        toast.success("Nota aggiornata");
      } else {
        toast.error(result.error.fieldErrors?.content?.[0] ?? result.error.message);
      }
    });
  }

  async function deleteNote(): Promise<boolean> {
    const result = await deleteNoteAction(note.id);
    if (result.ok) {
      toast.success("Nota eliminata");
      return true;
    }
    toast.error(result.error.message);
    return false;
  }

  return (
    <article className="py-5">
      <header className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-3">
          <span className="font-medium text-ink-2">{note.isOwn ? "Tu" : note.authorName}</span> · {createdLabel}
          {wasEdited ? " · modificata" : ""}
        </p>
        {note.isOwn && !isEditing ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(note.content);
                setIsEditing(true);
              }}
              icon={<Pencil aria-hidden="true" className="size-3.5" strokeWidth={1.75} />}
            >
              Modifica
            </Button>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="danger" icon={<Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.75} />}>
                  Elimina
                </Button>
              }
              title="Eliminare questa nota?"
              description="La nota verrà eliminata definitivamente anche per le colleghe che seguono questa cliente."
              confirmLabel="Elimina nota"
              onConfirm={deleteNote}
            />
          </div>
        ) : null}
      </header>

      {isEditing ? (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor={`edit-note-${note.id}`} className="sr-only">
            Modifica nota
          </label>
          <Textarea
            id={`edit-note-${note.id}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <span className="mr-auto text-xs text-ink-3">
              {draft.length}/{NOTE_MAX_LENGTH}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
              Annulla
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={saveEdit}
              isLoading={isSaving}
              disabled={!draft.trim() || draft.length > NOTE_MAX_LENGTH}
            >
              Salva
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-pretty text-ink">{note.content}</p>
      )}
    </article>
  );
}
