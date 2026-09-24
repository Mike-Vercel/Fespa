/** Dove arriverà la risposta salvata: nell'area clienti oppure copiata a mano dalla coach. */
export function ReplyDeliveryNote({ clientFirstName, visibleToClient }: { clientFirstName: string; visibleToClient: boolean }) {
  return (
    <p className="text-xs text-ink-3">
      {visibleToClient
        ? `${clientFirstName} vedrà la risposta nella sua area clienti.`
        : `${clientFirstName} non usa l'area clienti: dopo il salvataggio copia il testo e invialo dal tuo canale abituale.`}
    </p>
  );
}
