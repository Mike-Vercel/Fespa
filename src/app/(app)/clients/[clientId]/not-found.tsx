import { UserX } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

/**
 * Stesso messaggio per "cliente inesistente" e "cliente non assegnata":
 * distinguerli rivelerebbe l'esistenza di clienti di altre coach.
 */
export default function ClientNotFound() {
  return (
    <EmptyState
      icon={UserX}
      title="Cliente non disponibile"
      description="Questa cliente non esiste oppure non è assegnata al tuo account. Se pensi sia un errore, contatta l'amministratore."
      action={
        <Link href="/clients" className={buttonClasses("primary")}>
          Torna alle clienti
        </Link>
      }
      className="py-24"
    />
  );
}
