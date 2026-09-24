import { SearchX, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { isAdminRole } from "@/domain/roles";
import { ClientListToolbar } from "@/features/clients/client-list-toolbar";
import { ClientTable } from "@/features/clients/client-table";
import { NewClientDialog } from "@/features/clients/new-client-dialog";
import { pluralize } from "@/lib/format";
import { requireCoach } from "@/server/auth/session";
import { listClients } from "@/server/services/clients";
import { parseClientListQuery } from "@/validation/clients";

export const metadata: Metadata = { title: "Clienti" };

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const context = await requireCoach();
  const query = parseClientListQuery(await searchParams);
  const now = new Date();
  const list = await listClients(context, query, now);
  const hasFilters = query.q !== "" || query.status !== "all";

  return (
    <div className="flex flex-col gap-7 animate-rise-in">
      <PageHeader
        title="Clienti"
        description={
          list.totalClients > 0
            ? `${pluralize(list.totalClients, "cliente", "clienti")} in carico. Ordinate per priorità: in alto chi richiede attenzione.`
            : undefined
        }
        actions={<NewClientDialog today={list.today} />}
      />

      {list.totalClients === 0 && !hasFilters ? (
        <EmptyState
          icon={Users}
          title="Ancora nessuna cliente"
          description="Aggiungi la prima con “Nuova cliente”: riceverà un invito per completare da sola il suo profilo. Anche le clienti che l'admin ti assegna compariranno qui."
        />
      ) : (
        <>
          <section aria-label="Elenco clienti" className="overflow-hidden rounded-lg border border-line bg-surface shadow-raised">
            <div className="border-b border-line bg-sunken px-4 py-4 sm:px-5">
              <ClientListToolbar query={query} />
            </div>
            {list.rows.length > 0 ? (
              <div className="px-4 sm:px-5">
                <ClientTable
                  rows={list.rows}
                  now={now}
                  today={list.today}
                  timezone={list.timezone}
                  showCoachWarnings={isAdminRole(context.coach.role)}
                />
              </div>
            ) : (
              <EmptyState
                icon={SearchX}
                title="Nessun risultato"
                description={
                  query.q
                    ? `Nessuna cliente corrisponde a “${query.q}” con i filtri selezionati.`
                    : "Nessuna cliente corrisponde ai filtri selezionati."
                }
                action={
                  <Link href="/clients" className={buttonClasses("secondary")}>
                    Azzera i filtri
                  </Link>
                }
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
