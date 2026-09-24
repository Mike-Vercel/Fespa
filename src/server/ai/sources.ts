import "server-only";
import type { AISourceKind, AISourceLink } from "@/types/ai";

const PREFIX: Record<AISourceKind, string> = { checkin: "C", note: "N", followup: "F" };

/**
 * Riferimenti brevi ai dati mostrati al modello (C1, N2, F1…), validi per una sola richiesta.
 *
 * - Al modello non si passano UUID interni: riferimenti corti, niente ID nel contesto.
 * - Quando il modello cita una fonte, la si risolve qui: riferimenti inventati vengono scartati.
 * - La coach vede le fonti come link e può verificare cosa ha usato l'AI.
 */
export class SourceRegistry {
  private readonly byRef = new Map<string, AISourceLink>();
  private readonly refById = new Map<string, string>();
  private readonly counters: Record<AISourceKind, number> = { checkin: 0, note: 0, followup: 0 };

  register(kind: AISourceKind, id: string, label: string): string {
    const existing = this.refById.get(`${kind}:${id}`);
    if (existing) {
      return existing;
    }
    this.counters[kind] += 1;
    const ref = `${PREFIX[kind]}${this.counters[kind]}`;
    this.byRef.set(ref, { ref, kind, id, label });
    this.refById.set(`${kind}:${id}`, ref);
    return ref;
  }

  /** Solo i riferimenti realmente registrati, senza duplicati, nell'ordine citato. */
  resolve(refs: string[]): AISourceLink[] {
    const unique = [...new Set(refs.map((ref) => ref.trim().toUpperCase()))];
    return unique.map((ref) => this.byRef.get(ref)).filter((link): link is AISourceLink => link !== undefined);
  }
}
