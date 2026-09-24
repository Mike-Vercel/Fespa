/**
 * Ricerca tra gli utenti registrati per nome o email.
 * Ignora maiuscole e accenti ("nicolo" trova "Nicolò") e accetta più parole in qualsiasi ordine
 * ("giglio gmail" trova "Luigi Michael Giglio · michaelgiglio68@gmail.com").
 */

export function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function matchesUserSearch(user: { fullName: string; email: string }, query: string): boolean {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return true;
  }
  const searchable = normalizeForSearch(`${user.fullName} ${user.email}`);
  return terms.every((term) => searchable.includes(term));
}
