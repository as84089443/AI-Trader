import type { Itinerary } from "@flight-finder/core";

/**
 * In-memory store for itineraries captured by the Skyscanner extension (Phase 1b).
 * Kept on `globalThis` so it survives Next.js dev hot-reloads. This is for the
 * personal/local single-process use case; a hosted multi-instance deployment
 * would swap this for a real store (KV/Redis).
 */
interface Store {
  items: Map<string, Itinerary>;
  updatedAt: number;
}

const CAP = 500;

const g = globalThis as unknown as { __ffCaptureStore?: Store };

function store(): Store {
  return (g.__ffCaptureStore ??= { items: new Map(), updatedAt: 0 });
}

export function addCaptured(itineraries: Itinerary[]): number {
  const s = store();
  let added = 0;
  for (const it of itineraries) {
    if (!s.items.has(it.id)) added++;
    s.items.set(it.id, it);
  }
  // Trim oldest insertions if over cap (Map preserves insertion order).
  while (s.items.size > CAP) {
    const oldest = s.items.keys().next().value;
    if (oldest === undefined) break;
    s.items.delete(oldest);
  }
  s.updatedAt = Date.now();
  return added;
}

export function getCaptured(): { itineraries: Itinerary[]; updatedAt: number } {
  const s = store();
  return { itineraries: [...s.items.values()], updatedAt: s.updatedAt };
}

export function clearCaptured(): void {
  const s = store();
  s.items.clear();
  s.updatedAt = Date.now();
}
