import type { Itinerary } from "./types";

export interface FilterOptions {
  /** Keep only itineraries where every leg is non-stop. */
  directOnly?: boolean;
  /** Max number of stops allowed on the worst leg. */
  maxStops?: number;
  minPrice?: number;
  maxPrice?: number;
  /** Keep itineraries whose carriers intersect this set (IATA codes). */
  airlines?: string[];
  /** Max total duration across all legs, in minutes. */
  maxDurationMinutes?: number;
}

export function isDirect(it: Itinerary): boolean {
  return it.legs.every((l) => l.stops === 0);
}

/** Worst (max) stop count across the itinerary's legs. */
export function maxStops(it: Itinerary): number {
  return it.legs.reduce((acc, l) => Math.max(acc, l.stops), 0);
}

export function totalDurationMinutes(it: Itinerary): number {
  return it.legs.reduce((acc, l) => acc + l.durationMinutes, 0);
}

export function applyFilters(
  itineraries: Itinerary[],
  filters: FilterOptions = {},
): Itinerary[] {
  const airlineSet = filters.airlines?.length
    ? new Set(filters.airlines.map((a) => a.toUpperCase()))
    : undefined;

  return itineraries.filter((it) => {
    if (filters.directOnly && !isDirect(it)) return false;
    if (filters.maxStops != null && maxStops(it) > filters.maxStops) return false;
    if (filters.minPrice != null && it.price < filters.minPrice) return false;
    if (filters.maxPrice != null && it.price > filters.maxPrice) return false;
    if (
      filters.maxDurationMinutes != null &&
      totalDurationMinutes(it) > filters.maxDurationMinutes
    )
      return false;
    if (airlineSet) {
      const hit = it.carriers.some((c) => airlineSet.has(c.toUpperCase()));
      if (!hit) return false;
    }
    return true;
  });
}

/** Distinct carriers present across a set of itineraries (for filter UI). */
export function availableAirlines(itineraries: Itinerary[]): string[] {
  return Array.from(
    new Set(itineraries.flatMap((it) => it.carriers).filter(Boolean)),
  ).sort();
}
