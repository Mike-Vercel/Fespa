import { NotebookPen } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { formatRelativeInstant } from "@/lib/format";
import type { NoteItem } from "@/types/domain";
import { NoteCard } from "./note-card";
import { NoteComposer } from "./note-composer";

/** Soglia oltre la quale una nota si considera modificata dopo la creazione (non per millisecondi di scarto). */
const EDITED_THRESHOLD_MS = 60_000;

type ClientNotesPanelProps = {
  clientId: string;
  notes: NoteItem[];
  now: Date;
  timezone: string;
};

export function ClientNotesPanel({ clientId, notes, now, timezone }: ClientNotesPanelProps) {
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <NoteComposer clientId={clientId} />

      {notes.length > 0 ? (
        <div className="divide-y divide-line border-t border-line">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              createdLabel={formatRelativeInstant(note.createdAt, now, timezone)}
              wasEdited={new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > EDITED_THRESHOLD_MS}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={NotebookPen}
          title="Ancora nessuna nota"
          description="Le note aiutano te e le colleghe a ricordare contesto, accordi e osservazioni."
        />
      )}
    </div>
  );
}
