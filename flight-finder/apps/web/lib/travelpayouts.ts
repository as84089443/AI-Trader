import {
  normalizeTravelpayouts,
  type Itinerary,
  type TravelpayoutsResponse,
} from "@flight-finder/core";

const ENDPOINT = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";

export interface FetchPricesOptions {
  /** "YYYY-MM" or "YYYY-MM-DD". */
  departAt: string;
  returnAt?: string;
  currency?: string;
  limit?: number;
}

/**
 * Fetch cached cheapest fares for one route from the Travelpayouts data API.
 * Returns normalized itineraries, or [] when no token is configured (the boards
 * layer then falls back to seed data).
 */
export async function fetchRoutePrices(
  origin: string,
  destination: string,
  opts: FetchPricesOptions,
): Promise<Itinerary[]> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) return [];

  const currency = opts.currency ?? process.env.TRIP_CURRENCY ?? "TWD";
  const params = new URLSearchParams({
    origin: origin.toUpperCase(),
    destination: destination.toUpperCase(),
    departure_at: opts.departAt,
    currency: currency.toLowerCase(),
    sorting: "price",
    direct: "false",
    limit: String(opts.limit ?? 30),
    one_way: opts.returnAt ? "false" : "true",
    market: "tw",
    unique: "false",
  });
  if (opts.returnAt) params.set("return_at", opts.returnAt);

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: { "X-Access-Token": token },
    // Let the page's ISR revalidate window control freshness (daily).
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    throw new Error(
      `Travelpayouts ${origin}-${destination} failed: ${res.status}`,
    );
  }
  const json = (await res.json()) as TravelpayoutsResponse;
  return normalizeTravelpayouts(json, currency);
}

export function hasTravelpayoutsToken(): boolean {
  return Boolean(process.env.TRAVELPAYOUTS_TOKEN);
}
