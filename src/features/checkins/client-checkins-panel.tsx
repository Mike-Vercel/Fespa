import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/states";
import type { CheckinItem } from "@/types/domain";
import { CheckinCard } from "./checkin-card";

type ClientCheckinsPanelProps = {
  checkins: CheckinItem[];
  timezone: string;
  /** Strumenti sotto ogni check-in (analisi AI, bozza, revisione), forniti dalla pagina. */
  renderFooter: (checkin: CheckinItem) => ReactNode;
};

export function ClientCheckinsPanel({ checkins, timezone, renderFooter }: ClientCheckinsPanelProps) {
  if (checkins.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Nessun check-in"
        description="Quando la cliente invierà il suo primo check-in, lo troverai qui."
      />
    );
  }

  return (
    <div className="max-w-4xl divide-y divide-line">
      {checkins.map((checkin) => (
        <CheckinCard key={checkin.id} checkin={checkin} timezone={timezone} footer={renderFooter(checkin)} />
      ))}
    </div>
  );
}
