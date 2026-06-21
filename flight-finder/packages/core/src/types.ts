/**
 * Normalized, framework-agnostic flight model.
 *
 * Every data source (Amadeus API in Phase 1a, the Skyscanner-interception
 * extension in Phase 1b) is mapped into these types by `normalize.ts`, so the
 * comparison / filter / affiliate logic never needs to know where data came from.
 */

export type DataSource = "amadeus" | "skyscanner";

export type TripType = "oneway" | "roundtrip" | "multicity";

export type Cabin = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

/** A single flown segment (one aircraft hop). */
export interface Segment {
  from: string; // IATA airport code, e.g. "TPE"
  to: string; // IATA airport code, e.g. "VIE"
  departAt: string; // local ISO datetime, e.g. "2026-10-16T23:55:00"
  arriveAt: string;
  carrier: string; // marketing carrier IATA, e.g. "BR"
  flightNumber: string; // e.g. "BR61"
  durationMinutes: number;
}

/**
 * One directional journey (origin -> destination on a given date). May contain
 * multiple {@link Segment}s when it involves connections. A round-trip has two
 * legs; an outer-station four-leg ticket has four.
 */
export interface Leg {
  from: string;
  to: string;
  date: string; // departure date "YYYY-MM-DD"
  segments: Segment[];
  stops: number; // segments.length - 1
  durationMinutes: number;
}

/** A priced, bookable offer made of one or more legs. */
export interface Itinerary {
  id: string;
  source: DataSource;
  legs: Leg[];
  price: number;
  currency: string;
  /** Validating / primary carrier IATA code. */
  carrier: string;
  /** All distinct marketing carriers across the itinerary. */
  carriers: string[];
  cabin: Cabin;
  /** Optional human carrier names keyed by IATA, from source dictionaries. */
  carrierNames?: Record<string, string>;
  /** Deep-link the source itself provided, if any (we normally rebuild our own). */
  sourceUrl?: string;
}

export interface SearchQuery {
  from: string;
  to: string;
  departDate: string;
  returnDate?: string;
  tripType: TripType;
  adults: number;
  cabin: Cabin;
  /** Multi-city legs, when tripType === "multicity". */
  legs?: { from: string; to: string; date: string }[];
}

/* ----------------------------- Comparison table ---------------------------- */

/** One cell = the cheapest offer for a (route, date) pair. */
export interface ComparisonCell {
  route: string; // "TPE-VIE"
  date: string; // "YYYY-MM-DD"
  cheapest: number;
  cheapestCarrier: string;
  currency: string;
  secondCheapest?: number;
  secondCheapestCarrier?: string;
  /** True when this is the single lowest price in the whole table (★ 最低價). */
  isOverallCheapest: boolean;
  itineraryId: string;
}

export interface ComparisonRow {
  /** Row label — typically the origin city/airport (for reverse-origin compare). */
  label: string;
  /** Aligned 1:1 with {@link ComparisonTable.columns}; null = no offer for that column. */
  cells: (ComparisonCell | null)[];
}

export interface ComparisonTable {
  /** Column headers — destination routes or dates depending on caller. */
  columns: string[];
  rows: ComparisonRow[];
  currency: string;
  /** Coordinates of the ★ cheapest cell, for UI highlighting. */
  cheapest?: { rowLabel: string; route: string; date: string; price: number };
}

/* --------------------------- Reverse-origin compare ------------------------ */

export interface ReverseOriginResult {
  forwardRoute: string; // "TPE-VIE"
  reverseRoute: string; // "VIE-TPE"
  forwardCheapest?: number;
  reverseCheapest?: number;
  currency: string;
  /** Which direction is cheaper, or "equal"/"n/a". */
  cheaperDirection: "forward" | "reverse" | "equal" | "n/a";
  /** forwardCheapest - reverseCheapest (positive => reverse is cheaper). */
  delta?: number;
}

/* ----------------------------- Outer-station 4-leg ------------------------- */

/**
 * Inputs for evaluating an outer-station four-leg (外站四段票) plan.
 *
 * Reminder of the mechanics (corrected per monkeywalker/huitinchou/boysmom/difenygo):
 * the traveler flies ALL FOUR legs (outer -> TPE -> dest -> TPE -> outer) on one
 * ticket, after self-buying a cheap positioning hop (TPE -> outer). The first leg
 * must NOT be a no-show or the rest of the ticket is voided. Savings come from the
 * outer country's cheaper international fare, so total cost MUST include the
 * positioning hop before comparing against a plain Taiwan round-trip.
 */
export interface FourLegInput {
  outerStation: string; // e.g. "OKA"
  hub: string; // e.g. "TPE"
  destination: string; // e.g. "VIE"
  /** Price of the four-leg ticket itself (outer->TPE->dest->TPE->outer). */
  fourLegFare: number;
  /** Self-bought LCC positioning hop TPE->outer (round-trip or as needed). */
  positioningCost: number;
  /** Plain Taiwan round-trip fare TPE<->dest, for comparison. */
  directTwFare: number;
  currency: string;
  carrier?: string;
}

export interface FourLegResult extends FourLegInput {
  /** fourLegFare + positioningCost. */
  totalCost: number;
  /** directTwFare - totalCost (positive => four-leg is cheaper). */
  savings: number;
  cheaperThanDirect: boolean;
  /** Set when the plan is not worth recommending (e.g. costs more). */
  notRecommendedReason?: string;
  /** Always-on reminder surfaced in the UI. */
  warning: string;
}
