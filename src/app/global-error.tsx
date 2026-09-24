"use client";

/**
 * Ultima rete di sicurezza (errore nel layout radice). Sostituisce l'intero documento,
 * quindi non può contare su font e stili globali: usa stili inline minimi.
 */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#f7f5f0",
          color: "#1f1d1a",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <title>Errore · FESPA Coach AI</title>
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ fontSize: 20, margin: 0 }}>Qualcosa non ha funzionato</p>
          <p style={{ color: "#57534c", fontSize: 14 }}>Si è verificato un errore imprevisto. Riprova tra qualche istante.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 12,
              height: 40,
              padding: "0 16px",
              borderRadius: 8,
              border: 0,
              background: "#1f1d1a",
              color: "#f7f5f0",
              cursor: "pointer",
            }}
          >
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
