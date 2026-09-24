import { Compass } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

/** notFound() dentro l'area staff: resta nella shell (sidebar e topbar), senza un secondo <main>. */
export default function StaffNotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Pagina non trovata"
      description="L'indirizzo potrebbe essere sbagliato, la pagina non esiste più oppure non è disponibile per il tuo account."
      action={
        <Link href="/dashboard" className={buttonClasses("primary")}>
          Torna alla dashboard
        </Link>
      }
      className="py-24"
    />
  );
}
