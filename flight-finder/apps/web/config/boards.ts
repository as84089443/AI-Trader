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
    id: "reverse-bkk",
    title: "反向出發地・飛曼谷（從哪裡出發最便宜）",
    description:
      "同樣到 BKK，比較從台北 / 吉隆坡 / 香港 / 首爾 出發的最低價——反向出發地比價的精神（長程歐洲線請見『外站四段票試算』）。",
    origins: ["TPE", "KUL", "HKG", "ICN"],
    destinations: ["BKK"],
    layout: "origin",
  },
];
