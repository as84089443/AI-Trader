import type { Board } from "@/lib/boards";
import type { RouteSummary } from "@flight-finder/core";

function fmt(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

function bookingHref(s: RouteSummary, boardId: string): string {
  // Intentionally do NOT lock the airline (and leave stops flexible): the board
  // promises "cheapest for this route/date", so we land the user on Trip.com's
  // absolute lowest for that route + dates rather than constraining it to the
  // one carrier that happened to hold the cached lowest (which can price higher).
  const p = new URLSearchParams({
    from: s.origin,
    to: s.destination,
    departDate: s.bestDepartDate,
    tripType: s.bestReturnDate ? "roundtrip" : "oneway",
    adults: "1",
    cabin: "ECONOMY",
    nonstop: "off",
    sub1: "board",
    sub2: s.route,
    sub3: boardId,
  });
  if (s.bestReturnDate) p.set("returnDate", s.bestReturnDate);
  return `/api/booking?${p.toString()}`;
}

// Cheap = green, typical = amber, expensive = red (relative to this board).
const TIER_COLOR = {
  low: "var(--accent-2)",
  typical: "var(--star)",
  high: "var(--danger)",
} as const;

export function BoardTable({ board }: { board: Board }) {
  const prices = board.summaries.map((s) => s.cheapest);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const tier = (p: number): keyof typeof TIER_COLOR => {
    if (max === min) return "low";
    const r = (p - min) / (max - min);
    return r < 0.34 ? "low" : r < 0.67 ? "typical" : "high";
  };

  return (
    <div className="panel">
      <strong>{board.title}</strong>
      <p className="muted" style={{ margin: "4px 0 0" }}>
        {board.description}
      </p>

      {board.summaries.length === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          暫無資料。
        </p>
      ) : (
        <div className="deal-grid">
          {board.summaries.map((s) => {
            const label = board.layout === "origin" ? s.origin : s.destination;
            const pct = max > min ? Math.round((1 - s.cheapest / max) * 100) : 0;
            return (
              <a
                key={s.route}
                className={`deal-card${s.isCheapest ? " is-cheapest" : ""}`}
                href={bookingHref(s, board.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="dest">{label}</span>
                  {s.isCheapest ? (
                    <span className="chip chip-best">★ 最低價</span>
                  ) : pct >= 5 ? (
                    <span className="chip chip-direct">省 {pct}%</span>
                  ) : null}
                </div>

                <span className="fare" style={{ color: TIER_COLOR[tier(s.cheapest)] }}>
                  {fmt(s.cheapest, s.currency)}
                </span>

                <div className="meta">
                  {s.carrier}
                  {"　"}
                  <span className={`chip ${s.stops === 0 ? "chip-direct" : "chip-stop"}`}>
                    {s.stops === 0 ? "直飛" : `轉${s.stops}`}
                  </span>
                </div>
                <div className="meta">
                  {s.route}　|　{s.bestDepartDate}
                  {s.bestReturnDate ? ` → ${s.bestReturnDate}` : ""}
                </div>

                <span
                  className="book-link"
                  style={{ marginTop: "auto", alignSelf: "flex-start" }}
                >
                  Trip.com 訂票 →
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
