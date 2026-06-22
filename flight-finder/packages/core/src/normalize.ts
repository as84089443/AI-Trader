import type { Cabin, Itinerary, Leg, Segment } from "./types";

/**
 * Parse an ISO-8601 duration like "PT16H30M" / "PT55M" / "PT2H" into minutes.
 */
export function isoDurationToMinutes(iso: string | undefined): number {
  if (!iso) return 0;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso);
  if (!m) return 0;
  const hours = m[1] ? Number(m[1]) : 0;
  const mins = m[2] ? Number(m[2]) : 0;
  return hours * 60 + mins;
}

function dateOf(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

function normalizeCabin(raw: string | undefined): Cabin {
  switch ((raw ?? "").toUpperCase()) {
    case "PREMIUM_ECONOMY":
      return "PREMIUM_ECONOMY";
    case "BUSINESS":
      return "BUSINESS";
    case "FIRST":
      return "FIRST";
    default:
      return "ECONOMY";
  }
}

/* ------------------------------- Amadeus shapes ---------------------------- */

interface AmadeusSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
  duration?: string;
  numberOfStops?: number;
}

interface AmadeusItinerary {
  duration?: string;
  segments: AmadeusSegment[];
}

interface AmadeusOffer {
  id: string;
  itineraries: AmadeusItinerary[];
  price: { currency: string; grandTotal?: string; total?: string };
  validatingAirlineCodes?: string[];
  travelerPricings?: {
    fareDetailsBySegment?: { cabin?: string }[];
  }[];
}

export interface AmadeusFlightOffersResponse {
  data?: AmadeusOffer[];
  dictionaries?: { carriers?: Record<string, string> };
}

function amadeusSegment(s: AmadeusSegment): Segment {
  return {
    from: s.departure.iataCode,
    to: s.arrival.iataCode,
    departAt: s.departure.at,
    arriveAt: s.arrival.at,
    carrier: s.carrierCode,
    flightNumber: `${s.carrierCode}${s.number}`,
    durationMinutes: isoDurationToMinutes(s.duration),
  };
}

function amadeusLeg(it: AmadeusItinerary): Leg {
  const segments = it.segments.map(amadeusSegment);
  const first = segments[0];
  const last = segments[segments.length - 1];
  const declared = isoDurationToMinutes(it.duration);
  const summed = segments.reduce((acc, s) => acc + s.durationMinutes, 0);
  return {
    from: first?.from ?? "",
    to: last?.to ?? "",
    date: first ? dateOf(first.departAt) : "",
    segments,
    stops: Math.max(0, segments.length - 1),
    durationMinutes: declared || summed,
  };
}

/**
 * Normalize an Amadeus Flight Offers Search response into {@link Itinerary}[].
 */
export function normalizeAmadeus(
  resp: AmadeusFlightOffersResponse,
): Itinerary[] {
  const carrierNames = resp.dictionaries?.carriers;
  const offers = resp.data ?? [];
  return offers.map((offer): Itinerary => {
    const legs = offer.itineraries.map(amadeusLeg);
    const carriers = Array.from(
      new Set(legs.flatMap((l) => l.segments.map((s) => s.carrier))),
    );
    const primary =
      offer.validatingAirlineCodes?.[0] ?? carriers[0] ?? "";
    const cabin = normalizeCabin(
      offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin,
    );
    const priceStr = offer.price.grandTotal ?? offer.price.total ?? "0";
    return {
      id: `amadeus-${offer.id}`,
      source: "amadeus",
      legs,
      price: Number(priceStr),
      currency: offer.price.currency,
      carrier: primary,
      carriers,
      cabin,
      ...(carrierNames ? { carrierNames } : {}),
    };
  });
}

/* ------------------------------ Skyscanner shape --------------------------- */

/**
 * Minimal normalizer for the JSON the Phase 1b Skyscanner-interception extension
 * relays. Skyscanner's internal payload nests itineraries + legs + carriers in
 * lookup maps; this maps the common fields we need. Kept defensive because the
 * upstream shape changes across Skyscanner releases.
 */
export interface SkyscannerLikePayload {
  itineraries?: Array<{
    id?: string;
    price?: { amount?: number; currency?: string } | number;
    legs?: Array<{
      origin?: string;
      destination?: string;
      departure?: string;
      durationMinutes?: number;
      stopCount?: number;
      marketingCarrier?: string;
      segments?: Array<{
        origin?: string;
        destination?: string;
        departure?: string;
        arrival?: string;
        carrier?: string;
        flightNumber?: string;
        durationMinutes?: number;
      }>;
    }>;
    cabin?: string;
  }>;
  currency?: string;
}

export function normalizeSkyscanner(
  payload: SkyscannerLikePayload,
): Itinerary[] {
  const fallbackCurrency = payload.currency ?? "TWD";
  const out: Itinerary[] = [];
  for (const [i, it] of (payload.itineraries ?? []).entries()) {
    const legs: Leg[] = (it.legs ?? []).map((l) => {
      const segments: Segment[] = (l.segments ?? []).map((s) => ({
        from: s.origin ?? l.origin ?? "",
        to: s.destination ?? l.destination ?? "",
        departAt: s.departure ?? l.departure ?? "",
        arriveAt: s.arrival ?? "",
        carrier: s.carrier ?? l.marketingCarrier ?? "",
        flightNumber: s.flightNumber ?? "",
        durationMinutes: s.durationMinutes ?? 0,
      }));
      return {
        from: l.origin ?? segments[0]?.from ?? "",
        to: l.destination ?? segments[segments.length - 1]?.to ?? "",
        date: (l.departure ?? segments[0]?.departAt ?? "").slice(0, 10),
        segments,
        stops:
          l.stopCount ?? Math.max(0, segments.length - 1),
        durationMinutes: l.durationMinutes ?? 0,
      };
    });
    const price =
      typeof it.price === "number"
        ? it.price
        : (it.price?.amount ?? 0);
    const currency =
      (typeof it.price === "object" ? it.price?.currency : undefined) ??
      fallbackCurrency;
    const carriers = Array.from(
      new Set(legs.flatMap((l) => l.segments.map((s) => s.carrier)).filter(Boolean)),
    );
    out.push({
      id: it.id ? `skyscanner-${it.id}` : `skyscanner-${i}`,
      source: "skyscanner",
      legs,
      price,
      currency,
      carrier: carriers[0] ?? "",
      carriers,
      cabin: normalizeCabin(it.cabin),
    });
  }
  return out;
}

/* ----------------------------- Travelpayouts ------------------------------ */

/**
 * One item from the Travelpayouts "prices_for_dates" data API (cached cheapest
 * fares, free for affiliates). We use it purely as a data source; booking is
 * always rebuilt as a Trip.com affiliate link.
 */
export interface TravelpayoutsPrice {
  origin: string;
  destination: string;
  price: number;
  airline: string;
  flight_number?: number | string;
  departure_at: string; // ISO, e.g. "2026-10-16T23:55:00+08:00"
  return_at?: string;
  transfers?: number;
  return_transfers?: number;
  duration_to?: number; // minutes
  duration_back?: number;
}

export interface TravelpayoutsResponse {
  success?: boolean;
  data?: TravelpayoutsPrice[];
  currency?: string;
}

export function normalizeTravelpayouts(
  resp: TravelpayoutsResponse,
  currencyFallback = "TWD",
): Itinerary[] {
  const currency = (resp.currency ?? currencyFallback).toUpperCase();
  return (resp.data ?? []).map((p): Itinerary => {
    const departDate = p.departure_at.slice(0, 10);
    const outbound: Leg = {
      from: p.origin,
      to: p.destination,
      date: departDate,
      stops: p.transfers ?? 0,
      durationMinutes: p.duration_to ?? 0,
      segments: [
        {
          from: p.origin,
          to: p.destination,
          departAt: p.departure_at,
          arriveAt: "",
          carrier: p.airline,
          flightNumber: p.flight_number ? `${p.airline}${p.flight_number}` : "",
          durationMinutes: p.duration_to ?? 0,
        },
      ],
    };
    const legs: Leg[] = [outbound];
    if (p.return_at) {
      legs.push({
        from: p.destination,
        to: p.origin,
        date: p.return_at.slice(0, 10),
        stops: p.return_transfers ?? 0,
        durationMinutes: p.duration_back ?? 0,
        segments: [
          {
            from: p.destination,
            to: p.origin,
            departAt: p.return_at,
            arriveAt: "",
            carrier: p.airline,
            flightNumber: "",
            durationMinutes: p.duration_back ?? 0,
          },
        ],
      });
    }
    return {
      id: `tp-${p.origin}-${p.destination}-${departDate}-${p.price}`,
      source: "travelpayouts",
      legs,
      price: p.price,
      currency,
      carrier: p.airline,
      carriers: [p.airline],
      cabin: "ECONOMY",
    };
  });
}
