import type {
  ComparisonCell,
  ComparisonRow,
  ComparisonTable,
  FourLegInput,
  FourLegResult,
  Itinerary,
  ReverseOriginResult,
} from "./types";

/** Outbound route of an itinerary, e.g. "TPE-VIE", from its first leg. */
export function routeOf(it: Itinerary): string {
  const first = it.legs[0];
  return first ? `${first.from}-${first.to}` : "";
}

/** Origin (first leg's departure airport). */
export function originOf(it: Itinerary): string {
  return it.legs[0]?.from ?? "";
}

/** Departure date of the first leg. */
export function departDateOf(it: Itinerary): string {
  return it.legs[0]?.date ?? "";
}

function sortedByPrice(items: Itinerary[]): Itinerary[] {
  return [...items].sort((a, b) => a.price - b.price);
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = m.get(k);
    if (arr) arr.push(item);
    else m.set(k, [item]);
  }
  return m;
}

export interface BuildComparisonOptions {
  /** How to label each row. Default: origin airport of the itinerary. */
  rowBy?: (it: Itinerary) => string;
  /** How to label each column. Default: departure date. */
  columnBy?: (it: Itinerary) => string;
}

/**
 * Build the competitor-style comparison grid: rows (e.g. origin cities) ×
 * columns (e.g. dates), each cell = cheapest + second-cheapest + carrier, with
 * the single overall lowest price flagged (★ 最低價).
 */
export function buildComparison(
  itineraries: Itinerary[],
  options: BuildComparisonOptions = {},
): ComparisonTable {
  const rowBy = options.rowBy ?? originOf;
  const columnBy = options.columnBy ?? departDateOf;
  const currency = itineraries[0]?.currency ?? "TWD";

  const columns = Array.from(new Set(itineraries.map(columnBy))).sort();
  const byRow = groupBy(itineraries, rowBy);
  const rowLabels = Array.from(byRow.keys()).sort();

  // Track the global minimum to flag the ★ cheapest cell.
  let globalMin = Infinity;
  let globalCell: { rowLabel: string; route: string; date: string; price: number } | undefined;

  // First pass: build cells without the overall-cheapest flag.
  const rows: ComparisonRow[] = rowLabels.map((label) => {
    const rowItems = byRow.get(label) ?? [];
    const byCol = groupBy(rowItems, columnBy);
    const cells: (ComparisonCell | null)[] = columns.map((col) => {
      const group = byCol.get(col);
      if (!group || group.length === 0) return null;
      const sorted = sortedByPrice(group);
      const first = sorted[0]!;
      const second = sorted[1];
      const cell: ComparisonCell = {
        route: routeOf(first),
        date: col,
        cheapest: first.price,
        cheapestCarrier: first.carrier,
        currency: first.currency,
        isOverallCheapest: false,
        itineraryId: first.id,
        ...(second
          ? {
              secondCheapest: second.price,
              secondCheapestCarrier: second.carrier,
            }
          : {}),
      };
      if (first.price < globalMin) {
        globalMin = first.price;
        globalCell = {
          rowLabel: label,
          route: cell.route,
          date: col,
          price: first.price,
        };
      }
      return cell;
    });
    return { label, cells };
  });

  // Second pass: flag the overall cheapest cell.
  if (globalCell) {
    for (const row of rows) {
      if (row.label !== globalCell.rowLabel) continue;
      for (const cell of row.cells) {
        if (cell && cell.date === globalCell.date && cell.cheapest === globalCell.price) {
          cell.isOverallCheapest = true;
        }
      }
    }
  }

  return {
    columns,
    rows,
    currency,
    ...(globalCell ? { cheapest: globalCell } : {}),
  };
}

/** Cheapest price within a list of itineraries (or undefined if empty). */
export function cheapest(itineraries: Itinerary[]): number | undefined {
  if (itineraries.length === 0) return undefined;
  return sortedByPrice(itineraries)[0]!.price;
}

/**
 * Reverse-origin comparison: given offers for A→B (forward) and B→A (reverse),
 * report which direction is cheaper. This is the essence of "反向出發地比價".
 */
export function compareReverseOrigin(
  forward: Itinerary[],
  reverse: Itinerary[],
): ReverseOriginResult {
  const fwd = cheapest(forward);
  const rev = cheapest(reverse);
  const currency =
    forward[0]?.currency ?? reverse[0]?.currency ?? "TWD";
  const forwardRoute = forward[0] ? routeOf(forward[0]) : "";
  const reverseRoute = reverse[0] ? routeOf(reverse[0]) : "";

  let cheaperDirection: ReverseOriginResult["cheaperDirection"] = "n/a";
  let delta: number | undefined;
  if (fwd != null && rev != null) {
    delta = fwd - rev;
    cheaperDirection = delta > 0 ? "reverse" : delta < 0 ? "forward" : "equal";
  }

  return {
    forwardRoute,
    reverseRoute,
    ...(fwd != null ? { forwardCheapest: fwd } : {}),
    ...(rev != null ? { reverseCheapest: rev } : {}),
    currency,
    cheaperDirection,
    ...(delta != null ? { delta } : {}),
  };
}

export const FOUR_LEG_WARNING =
  "外站四段票需四段全搭：第一段（外站→樞紐）絕對不能 No-Show 或取消，否則後三段整票作廢。總價已含台灣→外站的自購卡位段。";

/**
 * Evaluate an outer-station four-leg plan. Crucially, the comparison includes the
 * self-bought positioning hop, and never claims savings the positioning cost
 * would erase.
 */
export function evaluateFourLeg(input: FourLegInput): FourLegResult {
  const totalCost = input.fourLegFare + input.positioningCost;
  const savings = input.directTwFare - totalCost;
  const cheaperThanDirect = savings > 0;
  const result: FourLegResult = {
    ...input,
    totalCost,
    savings,
    cheaperThanDirect,
    warning: FOUR_LEG_WARNING,
  };
  if (!cheaperThanDirect) {
    result.notRecommendedReason =
      savings === 0
        ? "含卡位段後與台灣直購來回同價，省不到，且四段彈性較差。"
        : `含卡位段後比台灣直購來回貴 ${Math.abs(savings)} ${input.currency}，不建議。`;
  }
  return result;
}

/**
 * Evaluate several outer-station four-leg plans and rank them best-first
 * (largest savings → smallest). Plans missing fare inputs (fourLegFare or
 * directTwFare not yet entered) are excluded so partially-filled rows don't
 * pollute the ranking.
 */
export function compareFourLegPlans(inputs: FourLegInput[]): FourLegResult[] {
  return inputs
    .filter((i) => i.fourLegFare > 0 && i.directTwFare > 0)
    .map(evaluateFourLeg)
    .sort((a, b) => b.savings - a.savings);
}
