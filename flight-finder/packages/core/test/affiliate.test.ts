import { describe, it, expect } from "vitest";
import { amadeusTpeVie } from "@flight-finder/fixtures";
import { normalizeAmadeus } from "../src/normalize";
import {
  DEFAULT_TRIP_CONFIG,
  buildBookingLinkFromItinerary,
  buildEztravelMulticity,
  buildEztravelRoundtrip,
  buildTripFlightLink,
} from "../src/affiliate";
import type { SearchQuery } from "../src/types";

describe("buildTripFlightLink", () => {
  it("carries the affiliate IDs and pre-fills the search", () => {
    const url = buildTripFlightLink({
      from: "TPE",
      to: "VIE",
      departDate: "2026-10-16",
      returnDate: "2026-10-26",
      tripType: "roundtrip",
      adults: 2,
      cabin: "ECONOMY",
      nonstopOnly: true,
      airline: "BR",
    });
    const u = new URL(url);
    expect(u.hostname).toBe("tw.trip.com");
    expect(u.pathname).toBe("/flights/showfarefirst");
    expect(u.searchParams.get("Allianceid")).toBe("8815318");
    expect(u.searchParams.get("SID")).toBe("320696671");
    expect(u.searchParams.get("dcity")).toBe("tpe");
    expect(u.searchParams.get("acity")).toBe("vie");
    expect(u.searchParams.get("ddate")).toBe("2026-10-16");
    expect(u.searchParams.get("rdate")).toBe("2026-10-26");
    expect(u.searchParams.get("triptype")).toBe("rt");
    expect(u.searchParams.get("quantity")).toBe("2");
    expect(u.searchParams.get("nonstoponly")).toBe("on");
    expect(u.searchParams.get("airline")).toBe("br");
    expect(u.searchParams.get("curr")).toBe("TWD");
  });

  it("omits rdate for one-way and maps business cabin", () => {
    const url = buildTripFlightLink({
      from: "TPE",
      to: "NRT",
      departDate: "2026-12-01",
      tripType: "oneway",
      adults: 1,
      cabin: "BUSINESS",
    });
    const u = new URL(url);
    expect(u.searchParams.get("triptype")).toBe("ow");
    expect(u.searchParams.has("rdate")).toBe(false);
    expect(u.searchParams.get("class")).toBe("c");
  });

  it("applies custom sub-labels for reporting", () => {
    const url = buildTripFlightLink(
      {
        from: "TPE",
        to: "VIE",
        departDate: "2026-10-16",
        tripType: "oneway",
        adults: 1,
        cabin: "ECONOMY",
      },
      { ...DEFAULT_TRIP_CONFIG, sub1: "four-leg", sub3: "results-table" },
    );
    const u = new URL(url);
    expect(u.searchParams.get("trip_sub1")).toBe("four-leg");
    expect(u.searchParams.get("trip_sub3")).toBe("results-table");
  });
});

describe("buildBookingLinkFromItinerary", () => {
  it("derives airline + route label from the itinerary", () => {
    const offers = normalizeAmadeus(amadeusTpeVie);
    const br = offers.find((o) => o.id === "amadeus-1")!;
    const query: SearchQuery = {
      from: "TPE",
      to: "VIE",
      departDate: "2026-10-16",
      returnDate: "2026-10-26",
      tripType: "roundtrip",
      adults: 1,
      cabin: "ECONOMY",
    };
    const u = new URL(buildBookingLinkFromItinerary(br, query));
    expect(u.searchParams.get("airline")).toBe("br");
    expect(u.searchParams.get("nonstoponly")).toBe("on");
    expect(u.searchParams.get("trip_sub2")).toBe("TPE-VIE");
  });
});

describe("ezTravel builders", () => {
  it("builds a round-trip link with DD/MM/YYYY dates and AllianceID", () => {
    const url = buildEztravelRoundtrip(
      {
        from: "TPE",
        to: "SIN",
        departDate: "2026-10-16",
        returnDate: "2026-10-19",
      },
      { allianceId: "411", sid: "1", ouid: "a001278" },
    );
    const u = new URL(url);
    expect(u.pathname).toBe("/tickets-roundtrip-tpe-sin/");
    expect(u.searchParams.get("outbounddate")).toBe("16/10/2026");
    expect(u.searchParams.get("inbounddate")).toBe("19/10/2026");
    expect(u.searchParams.get("AllianceID")).toBe("411");
  });

  it("builds a multi-city (four-leg) link with per-leg params", () => {
    const url = buildEztravelMulticity(
      [
        { from: "OKA", to: "TPE", date: "2026-10-16" },
        { from: "TPE", to: "VIE", date: "2026-10-16" },
        { from: "VIE", to: "TPE", date: "2026-10-26" },
        { from: "TPE", to: "OKA", date: "2026-10-26" },
      ],
      { allianceId: "411" },
    );
    const u = new URL(url);
    expect(u.pathname).toBe("/tickets-multicity-oka-oka/");
    expect(u.searchParams.get("dcity1")).toBe("oka");
    expect(u.searchParams.get("acity2")).toBe("vie");
    expect(u.searchParams.get("date4")).toBe("26/10/2026");
  });
});
