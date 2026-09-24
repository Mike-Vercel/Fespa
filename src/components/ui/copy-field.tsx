"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";

const COPIED_FEEDBACK_MS = 2000;

/** Valore in sola lettura con pulsante "Copia" (es. un link da condividere). */
export function CopyField({ id, label, value }: { id: string; label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard non disponibile (permessi o contesto non sicuro): il testo resta selezionabile a mano.
      document.getElementById(id)?.focus();
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          readOnly
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          className="h-10 min-w-0 flex-1 rounded-md border border-line bg-sunken px-3 text-sm text-ink-2"
        />
        <Button
          variant="secondary"
          onClick={copy}
          icon={copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
        >
          <span aria-live="polite">{copied ? "Copiato" : "Copia"}</span>
        </Button>
      </div>
    </div>
  );
}
