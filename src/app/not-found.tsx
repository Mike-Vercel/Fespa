import { Compass } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon={Compass}
        title="Pagina non trovata"
        description="L'indirizzo potrebbe essere sbagliato oppure la pagina non esiste più."
        action={
          <Link href="/dashboard" className={buttonClasses("primary")}>
            Torna alla dashboard
          </Link>
        }
      />
    </main>
  );
}
