"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

/**
 * Errori imprevisti durante il render delle pagine riservate.
 * In produzione Next non inoltra il messaggio originale al browser: si mostra solo
 * un testo comprensibile e il codice (digest) per ritrovare l'errore nei log del server.
 */
export function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorState
      icon={TriangleAlert}
      title="Qualcosa non ha funzionato"
      description={
        <>
          Non siamo riusciti a caricare questa pagina. Riprova tra qualche istante.
          {error.digest ? (
            <span className="mt-2 block text-xs text-ink-3">
              Codice per l&apos;assistenza: <code className="font-mono">{error.digest}</code>
            </span>
          ) : null}
        </>
      }
      action={
        <Button variant="primary" onClick={() => retry()}>
          Riprova
        </Button>
      }
      className="py-24"
    />
  );
}
