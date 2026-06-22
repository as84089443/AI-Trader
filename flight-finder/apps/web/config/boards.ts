/**
 * Curated "boards" — the daily, pre-computed price tables shown to visitors
 * (competitor-style). Each board fetches a fixed set of routes once per refresh
 * (ISR daily), so there are no per-visitor API calls and consumers install
 * nothing. Keep route counts modest to stay well within the free data-API tier.
 */
export interface BoardConfig {
  id: string;
  title: string;
  description: string;
  origins: string[];
  destinations: string[];
  /** "origin" => rows are origins (reverse-origin compare); "route" => one row per route. */
  layout: "origin" | "route";
}

/** Next month as "YYYY-MM" (a sensible default search window). */
export function defaultDepartMonth(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const BOARDS: BoardConfig[] = [
  {
    id: "weekend",
    title: "台北出發・短程來回最低價",
    description: "TPE 飛日韓港澳東南亞，每日更新各目的地當月最低來回價。",
    origins: ["TPE"],
    destinations: ["NRT", "KIX", "OKA", "ICN", "HKG", "BKK", "SIN", "DAD"],
    layout: "route",
  },
  {
    id: "reverse-europe",
    title: "反向出發地・歐洲線（飛維也納）",
    description:
      "同樣飛 VIE，比較從台北 vs 沖繩/吉隆坡/札幌/曼谷出發誰最便宜（外站票的精神）。",
    origins: ["TPE", "OKA", "KUL", "CTS", "BKK"],
    destinations: ["VIE"],
    layout: "origin",
  },
];
