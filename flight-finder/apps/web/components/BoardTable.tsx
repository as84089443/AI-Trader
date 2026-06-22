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
  const p = new URLSearchParams({
    from: s.origin,
    to: s.destination,
    departDate: s.bestDepartDate,
    tripType: s.bestReturnDate ? "roundtrip" : "oneway",
    adults: "1",
    cabin: "ECONOMY",
    nonstop: s.stops === 0 ? "on" : "off",
    airline: s.carrier,
    sub1: "board",
    sub2: s.route,
    sub3: boardId,
  });
  if (s.bestReturnDate) p.set("returnDate", s.bestReturnDate);
  return `/api/booking?${p.toString()}`;
}

export function BoardTable({ board }: { board: Board }) {
  const firstColHeader = board.layout === "origin" ? "出發地" : "目的地";
  return (
    <div className="panel">
      <strong>{board.title}</strong>
      <p className="muted" style={{ margin: "4px 0 12px" }}>
        {board.description}
      </p>
      {board.summaries.length === 0 ? (
        <p className="muted">暫無資料。</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>{firstColHeader}</th>
                <th>最低價</th>
                <th>航空</th>
                <th>最佳日期</th>
                <th>轉機</th>
                <th>訂票</th>
              </tr>
            </thead>
            <tbody>
              {board.summaries.map((s) => {
                const label =
                  board.layout === "origin" ? s.origin : s.destination;
                return (
                  <tr key={s.route} className={s.isCheapest ? "cheapest" : ""}>
                    <td>
                      {s.isCheapest && <span className="star">★ </span>}
                      <strong>{label}</strong>
                      <div className="muted">{s.route}</div>
                    </td>
                    <td className="price">{fmt(s.cheapest, s.currency)}</td>
                    <td>{s.carrier}</td>
                    <td className="muted">
                      {s.bestDepartDate}
                      {s.bestReturnDate ? ` → ${s.bestReturnDate}` : ""}
                    </td>
                    <td className="muted">
                      {s.stops === 0 ? "直飛" : `轉${s.stops}`}
                    </td>
                    <td>
                      <a
                        className="book-link"
                        href={bookingHref(s, board.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Trip.com 訂票
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
