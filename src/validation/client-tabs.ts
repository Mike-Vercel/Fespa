export const CLIENT_TABS = ["overview", "checkins", "notes", "followups"] as const;
export type ClientTab = (typeof CLIENT_TABS)[number];

export function parseClientTab(value: string | undefined): ClientTab {
  return CLIENT_TABS.find((tab) => tab === value) ?? "overview";
}
