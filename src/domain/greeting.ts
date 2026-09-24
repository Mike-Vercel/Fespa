const MORNING_STARTS_AT = 5;
const AFTERNOON_STARTS_AT = 13;
const EVENING_STARTS_AT = 18;

export function greetingForHour(hour: number): string {
  if (hour >= MORNING_STARTS_AT && hour < AFTERNOON_STARTS_AT) return "Buongiorno";
  if (hour >= AFTERNOON_STARTS_AT && hour < EVENING_STARTS_AT) return "Buon pomeriggio";
  return "Buonasera";
}

export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0];
}
