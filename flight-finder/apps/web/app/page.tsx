"use client";

import { useMemo, useState } from "react";
import {
  applyFilters,
  availableAirlines,
  buildComparison,
  type Cabin,
  type Itinerary,
  type ReverseOriginResult,
  type SearchQuery,
  type TripType,
} from "@flight-finder/core";
import { ComparisonTable } from "@/components/ComparisonTable";

interface SearchResponse {
  query: SearchQuery;
  demo: boolean;
  forward: Itinerary[];
  reverse?: Itinerary[];
  reverseSummary?: ReverseOriginResult;
}

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

function dur(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m.toString().padStart(2, "0")}m`;
}

function bookingHref(it: Itinerary, query: SearchQuery): string {
  const first = it.legs[0];
  const from = first?.from ?? query.from;
  const to = first?.to ?? query.to;
  const p = new URLSearchParams({
    from,
    to,
    departDate: first?.date ?? query.departDate,
    tripType: query.tripType,
    adults: String(query.adults),
    cabin: it.cabin,
    nonstop: it.legs.every((l) => l.stops === 0) ? "on" : "off",
    airline: it.carrier,
    sub1: "web-mvp",
    sub2: `${from}-${to}`,
    sub3: "results-table",
  });
  if (query.returnDate) p.set("returnDate", query.returnDate);
  return `/api/booking?${p.toString()}`;
}

const today = new Date();
const plus = (days: number) =>
  new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10);

export default function Home() {
  const [from, setFrom] = useState("TPE");
  const [to, setTo] = useState("VIE");
  const [departDate, setDepartDate] = useState(plus(60));
  const [returnDate, setReturnDate] = useState(plus(70));
  const [tripType, setTripType] = useState<TripType>("roundtrip");
  const [adults, setAdults] = useState(1);
  const [cabin, setCabin] = useState<Cabin>("ECONOMY");
  const [compareReverse, setCompareReverse] = useState(true);

  const [directOnly, setDirectOnly] = useState(false);
  const [airline, setAirline] = useState("ALL");

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          departDate,
          returnDate: tripType === "roundtrip" ? returnDate : undefined,
          tripType,
          adults,
          cabin,
          compareReverse,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "搜尋失敗");
      setData(json as SearchResponse);
      setAirline("ALL");
    } catch (err) {
      setError(err instanceof Error ? err.message : "搜尋失敗");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const allItineraries = useMemo(
    () => (data ? [...data.forward, ...(data.reverse ?? [])] : []),
    [data],
  );

  const airlines = useMemo(
    () => availableAirlines(allItineraries),
    [allItineraries],
  );

  const filtered = useMemo(
    () =>
      applyFilters(allItineraries, {
        directOnly,
        ...(airline !== "ALL" ? { airlines: [airline] } : {}),
      }),
    [allItineraries, directOnly, airline],
  );

  const table = useMemo(() => buildComparison(filtered), [filtered]);

  const forwardFiltered = useMemo(
    () =>
      data
        ? applyFilters(data.forward, {
            directOnly,
            ...(airline !== "ALL" ? { airlines: [airline] } : {}),
          }).sort((a, b) => a.price - b.price)
        : [],
    [data, directOnly, airline],
  );

  return (
    <main className="container">
      <nav className="crumbs">
        <a href="/boards">📅 每日比價表</a>
        <a href="/four-leg">外站四段票試算</a>
        <a href="/skyscanner">Skyscanner 攔截</a>
      </nav>
      <h1 className="title">Flight Finder ✈️</h1>
      <p className="subtitle">
        反向出發地比價 + 外站四段票，找出哪裡進出最便宜。資料顯示用，訂票導向
        Trip.com（你賺回饋）。想看每日自動更新的看板，點上方「每日比價表」。
      </p>

      <form className="panel" onSubmit={onSearch}>
        <div className="form-grid">
          <div>
            <label>出發地 (IATA)</label>
            <input value={from} onChange={(e) => setFrom(e.target.value)} maxLength={3} />
          </div>
          <div>
            <label>目的地 (IATA)</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} maxLength={3} />
          </div>
          <div>
            <label>去程日期</label>
            <input
              type="date"
              value={departDate}
              onChange={(e) => setDepartDate(e.target.value)}
            />
          </div>
          <div>
            <label>回程日期</label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              disabled={tripType !== "roundtrip"}
            />
          </div>
          <div>
            <label>行程類型</label>
            <select
              value={tripType}
              onChange={(e) => setTripType(e.target.value as TripType)}
            >
              <option value="roundtrip">來回</option>
              <option value="oneway">單程</option>
            </select>
          </div>
          <div>
            <label>人數</label>
            <input
              type="number"
              min={1}
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
            />
          </div>
          <div>
            <label>艙等</label>
            <select value={cabin} onChange={(e) => setCabin(e.target.value as Cabin)}>
              <option value="ECONOMY">經濟</option>
              <option value="PREMIUM_ECONOMY">豪華經濟</option>
              <option value="BUSINESS">商務</option>
              <option value="FIRST">頭等</option>
            </select>
          </div>
        </div>

        <div className="checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={compareReverse}
              onChange={(e) => setCompareReverse(e.target.checked)}
            />
            反向出發地比價（同時查 {to}→{from}）
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "搜尋中…" : "搜尋"}
          </button>
        </div>
      </form>

      {error && (
        <div className="panel">
          <p className="error">⚠️ {error}</p>
        </div>
      )}

      {data && (
        <>
          {data.demo && (
            <div className="callout warn">
              <span className="tag demo">DEMO</span> 目前使用內建範例資料（未設定
              Amadeus 金鑰）。在 <code>.env</code> 填入 <code>AMADEUS_CLIENT_ID</code> /
              <code>AMADEUS_CLIENT_SECRET</code> 後即為真實票價。
            </div>
          )}

          {data.reverseSummary && (
            <ReverseSummary summary={data.reverseSummary} />
          )}

          <div className="panel">
            <div className="row" style={{ marginBottom: 14 }}>
              <strong>比價表</strong>
              <label style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}>
                <input
                  type="checkbox"
                  checked={directOnly}
                  onChange={(e) => setDirectOnly(e.target.checked)}
                  style={{ width: "auto" }}
                />
                只看直飛
              </label>
              <select
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                style={{ width: "auto" }}
              >
                <option value="ALL">所有航空</option>
                {airlines.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <ComparisonTable data={table} />
            {table.cheapest && (
              <p className="muted" style={{ marginTop: 10 }}>
                ★ 全表最低：{table.cheapest.rowLabel} 出發，{table.cheapest.route}{" "}
                {table.cheapest.date}，{fmt(table.cheapest.price, table.currency)}
              </p>
            )}
          </div>

          <div className="panel">
            <strong>{data.query.from} → {data.query.to} 航班（依價格）</strong>
            <div className="flights-list" style={{ marginTop: 12 }}>
              {forwardFiltered.length === 0 && (
                <p className="muted">沒有符合篩選的航班。</p>
              )}
              {forwardFiltered.slice(0, 10).map((it) => {
                const isCheapest = forwardFiltered[0]?.id === it.id;
                return (
                  <div
                    key={it.id}
                    className={`flight-card${isCheapest ? " is-cheapest" : ""}`}
                  >
                    <div>
                      <div>
                        {isCheapest && <span className="star">★ </span>}
                        <strong>{it.carrier}</strong>{" "}
                        <span className="muted">
                          {it.carrierNames?.[it.carrier] ?? ""}
                        </span>
                      </div>
                      <div className="muted">
                        {it.legs
                          .map(
                            (l) =>
                              `${l.from}→${l.to} ${
                                l.stops === 0 ? "直飛" : `轉${l.stops}`
                              } ${dur(l.durationMinutes)}`,
                          )
                          .join("　|　")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="price">{fmt(it.price, it.currency)}</div>
                      <a
                        className="book-link"
                        href={bookingHref(it, data.query)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        前往 Trip.com 訂票
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="muted" style={{ marginTop: 10 }}>
              訂票連結帶你的 Trip.com 推薦碼（Allianceid 8815318 / SID 320696671），
              落在預填好的搜尋結果頁。價格為動態，點過去可能微幅變動。
            </p>
          </div>
        </>
      )}
    </main>
  );
}

function ReverseSummary({ summary }: { summary: ReverseOriginResult }) {
  const { cheaperDirection, forwardRoute, reverseRoute, delta, currency } =
    summary;
  if (cheaperDirection === "n/a") return null;
  if (cheaperDirection === "equal") {
    return (
      <div className="callout">
        正反向同價：{forwardRoute} 與 {reverseRoute} 最低價相同。
      </div>
    );
  }
  const cheaper = cheaperDirection === "reverse" ? reverseRoute : forwardRoute;
  const saved = delta != null ? Math.abs(delta) : 0;
  return (
    <div className="callout">
      💡 <strong>{cheaper}</strong> 方向較便宜
      {saved > 0 && (
        <>
          ，省約{" "}
          <strong>
            {new Intl.NumberFormat("zh-TW", {
              style: "currency",
              currency,
              maximumFractionDigits: 0,
            }).format(saved)}
          </strong>
        </>
      )}
      。（反向出發地比價：有時從目的地當「出發地」開票更省。）
    </div>
  );
}
