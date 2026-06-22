import { describe, it, expect } from "vitest";
import { amadeusTpeVie } from "@flight-finder/fixtures";
import { normalizeAmadeus } from "../src/normalize";
import {
  applyFilters,
  availableAirlines,
  isDirect,
  maxStops,
  totalDurationMinutes,
} from "../src/filters";

const offers = normalizeAmadeus(amadeusTpeVie);

describe("filter helpers", () => {
  it("detects direct itineraries (all legs non-stop)", () => {
    const br = offers.find((o) => o.id === "amadeus-1")!;
    const tk = offers.find((o) => o.id === "amadeus-2")!;
    expect(isDirect(br)).toBe(true);
    expect(isDirect(tk)).toBe(false);
    expect(maxStops(tk)).toBe(1);
  });

  it("sums total duration across legs", () => {
    const br = offers.find((o) => o.id === "amadeus-1")!;
    expect(totalDurationMinutes(br)).toBe(810 + 710);
  });

  it("lists available airlines sorted", () => {
    expect(availableAirlines(offers)).toEqual(["BR", "CI", "TK"]);
  });
});

describe("applyFilters", () => {
  it("directOnly keeps only non-stop itineraries", () => {
    const res = applyFilters(offers, { directOnly: true });
    expect(res.map((r) => r.id)).toEqual(["amadeus-1"]);
  });

  it("maxStops allows connections up to the limit", () => {
    expect(applyFilters(offers, { maxStops: 1 })).toHaveLength(3);
    expect(applyFilters(offers, { maxStops: 0 })).toHaveLength(1);
  });

  it("price range filters", () => {
    const res = applyFilters(offers, { maxPrice: 29000 });
    expect(res.map((r) => r.id).sort()).toEqual(["amadeus-2", "amadeus-3"]);
  });

  it("airline filter is case-insensitive and matches any segment carrier", () => {
    const res = applyFilters(offers, { airlines: ["br"] });
    expect(res.map((r) => r.id)).toEqual(["amadeus-1"]);
  });

  it("combines filters", () => {
    const res = applyFilters(offers, { maxStops: 1, maxPrice: 27000 });
    expect(res.map((r) => r.id)).toEqual(["amadeus-2"]);
  });
});
