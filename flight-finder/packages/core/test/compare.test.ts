import { describe, it, expect } from "vitest";
import { amadeusTpeVie, amadeusVieTpe } from "@flight-finder/fixtures";
import { normalizeAmadeus } from "../src/normalize";
import {
  buildComparison,
  compareFourLegPlans,
  compareReverseOrigin,
  evaluateFourLeg,
  routeOf,
} from "../src/compare";
import type { Itinerary } from "../src/types";

function mk(
  id: string,
  from: string,
  to: string,
  date: string,
  price: number,
  carrier: string,
): Itinerary {
  return {
    id,
    source: "amadeus",
    legs: [
      {
        from,
        to,
        date,
        stops: 0,
        durationMinutes: 600,
        segments: [
          {
            from,
            to,
            departAt: `${date}T00:00:00`,
            arriveAt: `${date}T10:00:00`,
            carrier,
            flightNumber: `${carrier}1`,
            durationMinutes: 600,
          },
        ],
      },
    ],
    price,
    currency: "TWD",
    carrier,
    carriers: [carrier],
    cabin: "ECONOMY",
  };
}

describe("buildComparison", () => {
  it("flags the single overall cheapest cell (★) and second-cheapest", () => {
    const items = [
      mk("a", "OKA", "VIE", "2026-10-16", 24000, "BR"),
      mk("b", "OKA", "VIE", "2026-10-16", 26000, "CI"),
      mk("c", "KUL", "VIE", "2026-10-16", 21000, "BR"),
      mk("d", "TPE", "VIE", "2026-10-16", 31000, "BR"),
    ];
    const table = buildComparison(items);

    expect(table.columns).toEqual(["2026-10-16"]);
    expect(table.rows.map((r) => r.label)).toEqual(["KUL", "OKA", "TPE"]);

    const oka = table.rows.find((r) => r.label === "OKA")!;
    expect(oka.cells[0]!.cheapest).toBe(24000);
    expect(oka.cells[0]!.secondCheapest).toBe(26000);
    expect(oka.cells[0]!.secondCheapestCarrier).toBe("CI");
    expect(oka.cells[0]!.isOverallCheapest).toBe(false);

    const kul = table.rows.find((r) => r.label === "KUL")!;
    expect(kul.cells[0]!.cheapest).toBe(21000);
    expect(kul.cells[0]!.isOverallCheapest).toBe(true);

    expect(table.cheapest).toEqual({
      rowLabel: "KUL",
      route: "KUL-VIE",
      date: "2026-10-16",
      price: 21000,
    });
  });

  it("leaves a null cell when an origin has no offer on a date", () => {
    const items = [
      mk("a", "OKA", "VIE", "2026-10-16", 24000, "BR"),
      mk("b", "KUL", "VIE", "2026-10-17", 21000, "BR"),
    ];
    const table = buildComparison(items);
    expect(table.columns).toEqual(["2026-10-16", "2026-10-17"]);
    const oka = table.rows.find((r) => r.label === "OKA")!;
    expect(oka.cells[0]).not.toBeNull();
    expect(oka.cells[1]).toBeNull();
  });
});

describe("compareReverseOrigin", () => {
  it("finds the cheaper direction including the delta", () => {
    const forward = normalizeAmadeus(amadeusTpeVie); // cheapest 26500
    const reverse = normalizeAmadeus(amadeusVieTpe); // cheapest 23000
    const res = compareReverseOrigin(forward, reverse);
    expect(res.forwardRoute).toBe("TPE-VIE");
    expect(res.reverseRoute).toBe("VIE-TPE");
    expect(res.forwardCheapest).toBe(26500);
    expect(res.reverseCheapest).toBe(23000);
    expect(res.delta).toBe(3500);
    expect(res.cheaperDirection).toBe("reverse");
  });

  it("handles an empty direction", () => {
    const res = compareReverseOrigin(normalizeAmadeus(amadeusTpeVie), []);
    expect(res.cheaperDirection).toBe("n/a");
    expect(res.reverseCheapest).toBeUndefined();
  });
});

describe("evaluateFourLeg", () => {
  it("includes the positioning hop and reports savings", () => {
    const res = evaluateFourLeg({
      outerStation: "OKA",
      hub: "TPE",
      destination: "VIE",
      fourLegFare: 22000,
      positioningCost: 5000,
      directTwFare: 31000,
      currency: "TWD",
    });
    expect(res.totalCost).toBe(27000);
    expect(res.savings).toBe(4000);
    expect(res.cheaperThanDirect).toBe(true);
    expect(res.notRecommendedReason).toBeUndefined();
    expect(res.warning).toContain("No-Show");
  });

  it("does not claim savings the positioning cost erases", () => {
    const res = evaluateFourLeg({
      outerStation: "OKA",
      hub: "TPE",
      destination: "VIE",
      fourLegFare: 28000,
      positioningCost: 6000,
      directTwFare: 31000,
      currency: "TWD",
    });
    expect(res.totalCost).toBe(34000);
    expect(res.savings).toBe(-3000);
    expect(res.cheaperThanDirect).toBe(false);
    expect(res.notRecommendedReason).toContain("3000");
  });
});

describe("compareFourLegPlans", () => {
  it("ranks plans best-first and skips rows missing fares", () => {
    const ranked = compareFourLegPlans([
      {
        outerStation: "OKA",
        hub: "TPE",
        destination: "VIE",
        fourLegFare: 22000,
        positioningCost: 5000,
        directTwFare: 31000,
        currency: "TWD",
      },
      {
        outerStation: "KUL",
        hub: "TPE",
        destination: "VIE",
        fourLegFare: 19000,
        positioningCost: 6000,
        directTwFare: 31000,
        currency: "TWD",
      },
      {
        // incomplete (no fourLegFare yet) -> excluded
        outerStation: "CTS",
        hub: "TPE",
        destination: "VIE",
        fourLegFare: 0,
        positioningCost: 4000,
        directTwFare: 31000,
        currency: "TWD",
      },
    ]);
    expect(ranked.map((r) => r.outerStation)).toEqual(["KUL", "OKA"]);
    expect(ranked[0]!.savings).toBe(6000); // 31000 - (19000+6000)
    expect(ranked[1]!.savings).toBe(4000); // 31000 - (22000+5000)
  });
});

describe("routeOf", () => {
  it("uses the first leg", () => {
    expect(routeOf(mk("x", "CTS", "LAX", "2026-10-16", 1, "BR"))).toBe("CTS-LAX");
  });
});
