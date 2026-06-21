import { describe, it, expect } from "vitest";
import { amadeusTpeVie } from "@flight-finder/fixtures";
import {
  isoDurationToMinutes,
  normalizeAmadeus,
  normalizeSkyscanner,
} from "../src/normalize";

describe("isoDurationToMinutes", () => {
  it("parses hours and minutes", () => {
    expect(isoDurationToMinutes("PT13H30M")).toBe(810);
    expect(isoDurationToMinutes("PT2H")).toBe(120);
    expect(isoDurationToMinutes("PT55M")).toBe(55);
    expect(isoDurationToMinutes(undefined)).toBe(0);
    expect(isoDurationToMinutes("garbage")).toBe(0);
  });
});

describe("normalizeAmadeus", () => {
  const offers = normalizeAmadeus(amadeusTpeVie);

  it("maps every offer", () => {
    expect(offers).toHaveLength(3);
  });

  it("normalizes a non-stop round-trip (EVA)", () => {
    const br = offers.find((o) => o.id === "amadeus-1")!;
    expect(br.source).toBe("amadeus");
    expect(br.price).toBe(31000);
    expect(br.currency).toBe("TWD");
    expect(br.carrier).toBe("BR");
    expect(br.legs).toHaveLength(2);
    expect(br.legs[0]!.from).toBe("TPE");
    expect(br.legs[0]!.to).toBe("VIE");
    expect(br.legs[0]!.date).toBe("2026-10-16");
    expect(br.legs[0]!.stops).toBe(0);
    expect(br.legs[0]!.durationMinutes).toBe(810);
    expect(br.cabin).toBe("ECONOMY");
  });

  it("counts stops on a connecting itinerary (Turkish via IST)", () => {
    const tk = offers.find((o) => o.id === "amadeus-2")!;
    expect(tk.legs[0]!.stops).toBe(1);
    expect(tk.carriers).toEqual(["TK"]);
    expect(tk.legs[0]!.segments[1]!.flightNumber).toBe("TK1885");
  });

  it("exposes carrier dictionary names", () => {
    expect(offers[0]!.carrierNames?.BR).toBe("EVA AIR");
  });
});

describe("normalizeSkyscanner", () => {
  it("maps a minimal interception payload", () => {
    const out = normalizeSkyscanner({
      currency: "TWD",
      itineraries: [
        {
          id: "abc",
          price: { amount: 25000, currency: "TWD" },
          cabin: "economy",
          legs: [
            {
              origin: "TPE",
              destination: "VIE",
              departure: "2026-10-16T23:55:00",
              stopCount: 0,
              marketingCarrier: "BR",
              durationMinutes: 810,
              segments: [
                {
                  origin: "TPE",
                  destination: "VIE",
                  carrier: "BR",
                  flightNumber: "BR61",
                  durationMinutes: 810,
                },
              ],
            },
          ],
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("skyscanner-abc");
    expect(out[0]!.source).toBe("skyscanner");
    expect(out[0]!.price).toBe(25000);
    expect(out[0]!.carrier).toBe("BR");
    expect(out[0]!.legs[0]!.date).toBe("2026-10-16");
  });
});
