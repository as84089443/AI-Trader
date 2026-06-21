import { NextResponse } from "next/server";
import {
  DEFAULT_TRIP_CONFIG,
  buildTripFlightLink,
  type Cabin,
  type TripAffiliateConfig,
  type TripType,
} from "@flight-finder/core";

export const dynamic = "force-dynamic";

/**
 * Affiliate redirect. The browser hits this with the chosen flight's params; we
 * 302 to the Trip.com deep-link carrying the affiliate IDs. Routing through our
 * own endpoint (rather than linking directly) keeps last-click attribution and
 * lets us log conversions later.
 */
export function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const departDate = sp.get("departDate");
  if (!from || !to || !departDate) {
    return NextResponse.json(
      { error: "from, to and departDate are required" },
      { status: 400 },
    );
  }

  const tripType = (sp.get("tripType") ?? "roundtrip") as TripType;
  const cabin = (sp.get("cabin") ?? "ECONOMY") as Cabin;

  const config: TripAffiliateConfig = {
    ...DEFAULT_TRIP_CONFIG,
    allianceId: process.env.TRIP_ALLIANCE_ID ?? DEFAULT_TRIP_CONFIG.allianceId,
    sid: process.env.TRIP_SID ?? DEFAULT_TRIP_CONFIG.sid,
    region: process.env.TRIP_REGION ?? DEFAULT_TRIP_CONFIG.region,
    currency: process.env.TRIP_CURRENCY ?? DEFAULT_TRIP_CONFIG.currency,
    ...(sp.get("sub1") ? { sub1: sp.get("sub1")! } : {}),
    ...(sp.get("sub2") ? { sub2: sp.get("sub2")! } : {}),
    ...(sp.get("sub3") ? { sub3: sp.get("sub3")! } : {}),
  };

  const url = buildTripFlightLink(
    {
      from,
      to,
      departDate,
      ...(sp.get("returnDate") ? { returnDate: sp.get("returnDate")! } : {}),
      tripType,
      adults: Math.max(1, Number(sp.get("adults")) || 1),
      cabin,
      nonstopOnly: sp.get("nonstop") === "on" || sp.get("nonstop") === "true",
      ...(sp.get("airline") ? { airline: sp.get("airline")! } : {}),
    },
    config,
  );

  return NextResponse.redirect(url, 302);
}
