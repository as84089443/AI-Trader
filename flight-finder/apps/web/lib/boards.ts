import {
  summarizeRoutes,
  type Itinerary,
  type RouteSummary,
} from "@flight-finder/core";
import { BOARDS, defaultDepartMonth, type BoardConfig } from "@/config/boards";
import { fetchRoutePrices, hasTravelpayoutsToken } from "@/lib/travelpayouts";

export interface Board {
  id: string;
  title: string;
  description: string;
  layout: BoardConfig["layout"];
  summaries: RouteSummary[];
}

export interface BoardsResult {
  boards: Board[];
  generatedAt: string;
  demo: boolean;
  departMonth: string;
}

/* ------------------------------- Seed (DEMO) ------------------------------ */

// Plausible sample fares so the boards render before a Travelpayouts token is
// set. Clearly labelled DEMO in the UI. The reverse-Europe numbers are biased so
// an outer station beats Taipei — illustrating the reverse-origin point.
const SEED: Record<string, { price: number; carrier: string; stops: number }> = {
  "TPE-NRT": { price: 7800, carrier: "JX", stops: 0 },
  "TPE-KIX": { price: 8200, carrier: "BR", stops: 0 },
  "TPE-OKA": { price: 6500, carrier: "CI", stops: 0 },
  "TPE-ICN": { price: 7200, carrier: "TW", stops: 0 },
  "TPE-HKG": { price: 5800, carrier: "CX", stops: 0 },
  "TPE-BKK": { price: 9100, carrier: "TG", stops: 0 },
  "TPE-SIN": { price: 11200, carrier: "SQ", stops: 0 },
  "TPE-DAD": { price: 8800, carrier: "VJ", stops: 0 },
  "TPE-VIE": { price: 31000, carrier: "BR", stops: 0 },
  "OKA-VIE": { price: 24000, carrier: "BR", stops: 1 },
  "KUL-VIE": { price: 22000, carrier: "TK", stops: 1 },
  "CTS-VIE": { price: 26500, carrier: "CI", stops: 1 },
  "BKK-VIE": { price: 23000, carrier: "TK", stops: 1 },
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function seedItinerary(
  origin: string,
  destination: string,
  departMonth: string,
): Itinerary {
  const route = `${origin}-${destination}`;
  const seed = SEED[route] ?? {
    price: 6000 + (hash(route) % 28000),
    carrier: ["BR", "CI", "JX", "TK"][hash(route) % 4]!,
    stops: hash(route) % 2,
  };
  const depart = `${departMonth}-18`;
  const back = `${departMonth}-28`;
  return {
    id: `seed-${route}-${depart}`,
    source: "travelpayouts",
    legs: [
      {
        from: origin,
        to: destination,
        date: depart,
        stops: seed.stops,
        durationMinutes: 0,
        segments: [],
      },
      {
        from: destination,
        to: origin,
        date: back,
        stops: seed.stops,
        durationMinutes: 0,
        segments: [],
      },
    ],
    price: seed.price,
    currency: "TWD",
    carrier: seed.carrier,
    carriers: [seed.carrier],
    cabin: "ECONOMY",
  };
}

/* ------------------------------- Build boards ----------------------------- */

async function itinerariesForRoute(
  origin: string,
  destination: string,
  departMonth: string,
  demo: boolean,
): Promise<Itinerary[]> {
  if (demo) return [seedItinerary(origin, destination, departMonth)];
  try {
    return await fetchRoutePrices(origin, destination, {
      departAt: departMonth,
      returnAt: departMonth,
    });
  } catch {
    // On a transient API error, fall back to seed for that route so the board
    // still renders rather than 500-ing the whole page.
    return [seedItinerary(origin, destination, departMonth)];
  }
}

async function buildBoard(
  cfg: BoardConfig,
  departMonth: string,
  demo: boolean,
): Promise<Board> {
  const routes = cfg.origins.flatMap((o) =>
    cfg.destinations.map((d) => [o, d] as const),
  );
  const perRoute = await Promise.all(
    routes.map(([o, d]) => itinerariesForRoute(o, d, departMonth, demo)),
  );
  const summaries = summarizeRoutes(perRoute.flat());
  return {
    id: cfg.id,
    title: cfg.title,
    description: cfg.description,
    layout: cfg.layout,
    summaries,
  };
}

/**
 * Build every board. Called from the ISR boards page (revalidated daily), so
 * the data API is hit at most once per day regardless of traffic.
 */
export async function getBoards(): Promise<BoardsResult> {
  const demo = !hasTravelpayoutsToken();
  const departMonth = defaultDepartMonth();
  const boards = await Promise.all(
    BOARDS.map((cfg) => buildBoard(cfg, departMonth, demo)),
  );
  return {
    boards,
    generatedAt: new Date().toISOString(),
    demo,
    departMonth,
  };
}
