import type { Cabin, Itinerary, SearchQuery, TripType } from "./types";

/* ------------------------------- Trip.com (P1) ----------------------------- */

/**
 * Trip.com affiliate attribution. `allianceId` + `sid` are what actually earn
 * the commission (these are the user's real, public promo-link IDs). The three
 * `sub` slots are free-form labels that only segment YOUR reports — set them to
 * meaningful campaign/route/placement values, never the console's material IDs.
 */
export interface TripAffiliateConfig {
  allianceId: string;
  sid: string;
  region?: string; // domain prefix, e.g. "tw" => tw.trip.com
  currency?: string; // e.g. "TWD"
  locale?: string; // e.g. "zh-TW"
  sub1?: string; // e.g. "four-leg"
  sub2?: string; // e.g. "TPE-VIE"
  sub3?: string; // e.g. "results-table"
}

/** Defaults baked from the user's own Trip.com promo links. */
export const DEFAULT_TRIP_CONFIG: TripAffiliateConfig = {
  allianceId: "8815318",
  sid: "320696671",
  region: "tw",
  currency: "TWD",
  locale: "zh-TW",
};

export interface TripFlightLinkParams {
  from: string;
  to: string;
  departDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  tripType: TripType;
  adults: number;
  cabin: Cabin;
  nonstopOnly?: boolean;
  /** Optional IATA carrier filter so a specific flight floats to the top. */
  airline?: string;
}

function cabinToTripClass(cabin: Cabin): string {
  switch (cabin) {
    case "BUSINESS":
      return "c";
    case "FIRST":
      return "f";
    default:
      return "y"; // economy / premium-economy
  }
}

function tripTripType(t: TripType): string {
  // showfarefirst supports round-trip / one-way; multi-city is built elsewhere.
  return t === "roundtrip" ? "rt" : "ow";
}

/**
 * Build a Trip.com flight search-results deep-link, pre-filled with the searched
 * flight and carrying the affiliate IDs (last-click attribution). NOTE: public
 * affiliate links only reach the results layer — there is no direct-to-checkout
 * URL for one exact fare (that needs the B2B booking API). We get as close as
 * possible by pre-filtering airline + nonstop so the target flight is on top.
 */
export function buildTripFlightLink(
  params: TripFlightLinkParams,
  config: TripAffiliateConfig = DEFAULT_TRIP_CONFIG,
): string {
  const region = config.region ?? "tw";
  const base = `https://${region}.trip.com/flights/showfarefirst`;
  const qs = new URLSearchParams();
  qs.set("dcity", params.from.toLowerCase());
  qs.set("acity", params.to.toLowerCase());
  qs.set("ddate", params.departDate);
  if (params.tripType === "roundtrip" && params.returnDate) {
    qs.set("rdate", params.returnDate);
  }
  qs.set("triptype", tripTripType(params.tripType));
  qs.set("class", cabinToTripClass(params.cabin));
  qs.set("quantity", String(Math.max(1, params.adults)));
  qs.set("nonstoponly", params.nonstopOnly ? "on" : "off");
  if (params.airline) qs.set("airline", params.airline.toLowerCase());
  qs.set("locale", config.locale ?? "zh-TW");
  qs.set("curr", config.currency ?? "TWD");
  // Affiliate attribution — the bit that earns commission.
  qs.set("Allianceid", config.allianceId);
  qs.set("SID", config.sid);
  if (config.sub1) qs.set("trip_sub1", config.sub1);
  if (config.sub2) qs.set("trip_sub2", config.sub2);
  if (config.sub3) qs.set("trip_sub3", config.sub3);
  return `${base}?${qs.toString()}`;
}

/**
 * Build a Trip.com booking link straight from a normalized itinerary + the
 * original query. Pre-fills the airline of the itinerary so it surfaces on top,
 * and auto-labels trip_sub2 with the route for reporting.
 */
export function buildBookingLinkFromItinerary(
  it: Itinerary,
  query: SearchQuery,
  config: TripAffiliateConfig = DEFAULT_TRIP_CONFIG,
): string {
  const first = it.legs[0];
  const from = first?.from ?? query.from;
  const to = first?.to ?? query.to;
  return buildTripFlightLink(
    {
      from,
      to,
      departDate: first?.date ?? query.departDate,
      ...(query.returnDate ? { returnDate: query.returnDate } : {}),
      tripType: query.tripType,
      adults: query.adults,
      cabin: it.cabin,
      nonstopOnly: it.legs.every((l) => l.stops === 0),
      airline: it.carrier,
    },
    { ...config, sub2: config.sub2 ?? `${from}-${to}` },
  );
}

/* ------------------------------ ezTravel (A/B) ----------------------------- */

/**
 * ezTravel deep-links are fully parameter-constructable; monetization needs only
 * your own AllianceID (apply via Affiliates.One). Kept as a second supplier so we
 * can A/B against Trip.com behind the same affiliate.ts interface.
 */
export interface EztravelConfig {
  allianceId: string;
  sid?: string;
  ouid?: string;
  tag?: string;
}

function toDdMmYyyy(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export function buildEztravelRoundtrip(
  params: {
    from: string;
    to: string;
    departDate: string; // YYYY-MM-DD
    returnDate: string; // YYYY-MM-DD
    adults?: number;
    children?: number;
    infants?: number;
    directOnly?: boolean;
  },
  config: EztravelConfig,
): string {
  const base = `https://flight.eztravel.com.tw/tickets-roundtrip-${params.from.toLowerCase()}-${params.to.toLowerCase()}/`;
  const qs = new URLSearchParams();
  qs.set("outbounddate", toDdMmYyyy(params.departDate));
  qs.set("inbounddate", toDdMmYyyy(params.returnDate));
  qs.set("adults", String(params.adults ?? 1));
  qs.set("children", String(params.children ?? 0));
  qs.set("infants", String(params.infants ?? 0));
  qs.set("direct", params.directOnly ? "true" : "false");
  qs.set("searchbox", "w");
  qs.set("utm_source", "lndata");
  qs.set("utm_medium", "promote");
  qs.set("AllianceID", config.allianceId);
  if (config.sid) qs.set("SID", config.sid);
  if (config.ouid) qs.set("OUID", config.ouid);
  if (config.tag) qs.set("tag", config.tag);
  return `${base}?${qs.toString()}`;
}

export function buildEztravelMulticity(
  legs: { from: string; to: string; date: string }[],
  config: EztravelConfig,
): string {
  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];
  const dep = (firstLeg?.from ?? "").toLowerCase();
  const arr = (lastLeg?.to ?? "").toLowerCase();
  const base = `https://flight.eztravel.com.tw/tickets-multicity-${dep}-${arr}/`;
  const qs = new URLSearchParams();
  legs.forEach((leg, i) => {
    const n = i + 1;
    qs.set(`dcity${n}`, leg.from.toLowerCase());
    qs.set(`acity${n}`, leg.to.toLowerCase());
    qs.set(`date${n}`, toDdMmYyyy(leg.date));
  });
  qs.set("cabintype", "any");
  qs.set("searchbox", "t");
  qs.set("utm_source", "lndata");
  qs.set("utm_medium", "promote");
  qs.set("AllianceID", config.allianceId);
  if (config.sid) qs.set("SID", config.sid);
  if (config.ouid) qs.set("OUID", config.ouid);
  if (config.tag) qs.set("tag", config.tag);
  return `${base}?${qs.toString()}`;
}
