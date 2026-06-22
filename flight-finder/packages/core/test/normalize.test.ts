import { describe, it, expect } from "vitest";
import { amadeusTpeVie } from "@flight-finder/fixtures";
import {
  isoDurationToMinutes,
  normalizeAmadeus,
  normalizeSkyscanner,
  normalizeTravelpayouts,
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

describe("normalizeTravelpayouts", () => {
  it("maps a round-trip cached price into two legs", () => {
    const out = normalizeTravelpayouts({
      success: true,
      currency: "twd",
      data: [
        {
          origin: "TPE",
          destination: "VIE",
          price: 28800,
          airline: "BR",
          flight_number: 61,
          departure_at: "2026-10-16T23:55:00+08:00",
          return_at: "2026-10-26T11:30:00+02:00",
          transfers: 0,
          return_transfers: 1,
          duration_to: 810,
        },
      ],
    });
    expect(out).toHaveLength(1);
    const it = out[0]!;
    expect(it.source).toBe("travelpayouts");
    expect(it.price).toBe(28800);
    expect(it.currency).toBe("TWD");
    expect(it.carrier).toBe("BR");
    expect(it.legs).toHaveLength(2);
    expect(it.legs[0]!.from).toBe("TPE");
    expect(it.legs[0]!.to).toBe("VIE");
    expect(it.legs[0]!.date).toBe("2026-10-16");
    expect(it.legs[0]!.stops).toBe(0);
    expect(it.legs[1]!.from).toBe("VIE");
    expect(it.legs[1]!.date).toBe("2026-10-26");
    expect(it.legs[1]!.stops).toBe(1);
  });

  it("handles a one-way item (single leg)", () => {
    const out = normalizeTravelpayouts({
      data: [
        {
          origin: "TPE",
          destination: "NRT",
          price: 6800,
          airline: "JX",
          departure_at: "2026-11-07T09:00:00+08:00",
          transfers: 0,
        },
      ],
    });
    expect(out[0]!.legs).toHaveLength(1);
    expect(out[0]!.currency).toBe("TWD"); // fallback
  });
});
