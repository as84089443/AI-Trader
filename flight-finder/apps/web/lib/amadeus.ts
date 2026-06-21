import {
  normalizeAmadeus,
  type AmadeusFlightOffersResponse,
  type Itinerary,
  type SearchQuery,
} from "@flight-finder/core";
import { amadeusTpeVie, amadeusVieTpe } from "@flight-finder/fixtures";

const HOST =
  process.env.AMADEUS_HOSTNAME === "production"
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(id: string, secret: string): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.token;
  }
  const res = await fetch(`${HOST}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Amadeus auth failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  };
  return json.access_token;
}

/** Demo data used when no Amadeus key is configured, so the app runs as-is. */
function demoOffers(query: SearchQuery): Itinerary[] {
  const route = `${query.from}-${query.to}`.toUpperCase();
  const src =
    route === "VIE-TPE"
      ? (amadeusVieTpe as AmadeusFlightOffersResponse)
      : (amadeusTpeVie as AmadeusFlightOffersResponse);
  return normalizeAmadeus(src);
}

export interface SearchResult {
  itineraries: Itinerary[];
  /** True when results came from bundled fixtures (no API key set). */
  demo: boolean;
}

export async function searchFlightOffers(
  query: SearchQuery,
): Promise<SearchResult> {
  const id = process.env.AMADEUS_CLIENT_ID;
  const secret = process.env.AMADEUS_CLIENT_SECRET;
  if (!id || !secret) {
    return { itineraries: demoOffers(query), demo: true };
  }

  const token = await getAccessToken(id, secret);
  const params = new URLSearchParams({
    originLocationCode: query.from.toUpperCase(),
    destinationLocationCode: query.to.toUpperCase(),
    departureDate: query.departDate,
    adults: String(Math.max(1, query.adults)),
    travelClass: query.cabin,
    currencyCode: process.env.TRIP_CURRENCY ?? "TWD",
    max: "25",
  });
  if (query.tripType === "roundtrip" && query.returnDate) {
    params.set("returnDate", query.returnDate);
  }

  const res = await fetch(
    `${HOST}/v2/shopping/flight-offers?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(
      `Amadeus flight-offers failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as AmadeusFlightOffersResponse;
  return { itineraries: normalizeAmadeus(json), demo: false };
}
