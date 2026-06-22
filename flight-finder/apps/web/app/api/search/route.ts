import { NextResponse } from "next/server";
import {
  compareReverseOrigin,
  type Cabin,
  type ReverseOriginResult,
  type SearchQuery,
  type TripType,
} from "@flight-finder/core";
import { searchFlightOffers } from "@/lib/amadeus";

export const dynamic = "force-dynamic";

const CABINS: Cabin[] = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"];
const TRIP_TYPES: TripType[] = ["oneway", "roundtrip", "multicity"];

interface SearchBody extends Partial<SearchQuery> {
  compareReverse?: boolean;
}

function parseQuery(body: SearchBody): SearchQuery | { error: string } {
  const from = (body.from ?? "").trim().toUpperCase();
  const to = (body.to ?? "").trim().toUpperCase();
  if (from.length !== 3 || to.length !== 3) {
    return { error: "from/to must be 3-letter IATA codes" };
  }
  if (!body.departDate) return { error: "departDate is required" };
  const tripType: TripType = TRIP_TYPES.includes(body.tripType as TripType)
    ? (body.tripType as TripType)
    : "roundtrip";
  const cabin: Cabin = CABINS.includes(body.cabin as Cabin)
    ? (body.cabin as Cabin)
    : "ECONOMY";
  return {
    from,
    to,
    departDate: body.departDate,
    ...(body.returnDate ? { returnDate: body.returnDate } : {}),
    tripType,
    adults: Math.max(1, Number(body.adults) || 1),
    cabin,
  };
}

export async function POST(request: Request) {
  let body: SearchBody;
  try {
    body = (await request.json()) as SearchBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = parseQuery(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const query = parsed;

  try {
    const forward = await searchFlightOffers(query);

    let reverse: Awaited<ReturnType<typeof searchFlightOffers>> | undefined;
    let reverseSummary: ReverseOriginResult | undefined;
    if (body.compareReverse) {
      reverse = await searchFlightOffers({
        ...query,
        from: query.to,
        to: query.from,
      });
      reverseSummary = compareReverseOrigin(
        forward.itineraries,
        reverse.itineraries,
      );
    }

    return NextResponse.json({
      query,
      demo: forward.demo,
      forward: forward.itineraries,
      ...(reverse ? { reverse: reverse.itineraries } : {}),
      ...(reverseSummary ? { reverseSummary } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
