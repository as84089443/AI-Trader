"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyFilters,
  availableAirlines,
  buildComparison,
  type Itinerary,
} from "@flight-finder/core";
import { ComparisonTable } from "@/components/ComparisonTable";

interface IngestState {
  count: number;
  updatedAt: number;
  itineraries: Itinerary[];
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
  return `${Math.floor(min / 60)}h${(min % 60).toString().padStart(2, "0")}m`;
}

// Derive a Trip.com booking redirect from a captured itinerary.
function bookingHref(it: Itinerary): string {
  const first = it.legs[0];
  const second = it.legs[1];
  const from = first?.from ?? "";
  const to = first?.to ?? "";
  const roundtrip = it.legs.length >= 2;
  const p = new URLSearchParams({
    from,
    to,
    departDate: first?.date ?? "",
    tripType: roundtrip ? "roundtrip" : "oneway",
    adults: "1",
    cabin: it.cabin,
    nonstop: it.legs.every((l) => l.stops === 0) ? "on" : "off",
    airline: it.carrier,
    sub1: "skyscanner",
    sub2: `${from}-${to}`,
    sub3: "intercept",
  });
  if (roundtrip && second?.date) p.set("returnDate", second.date);
  return `/api/booking?${p.toString()}`;
}

export default function SkyscannerPage() {
  const [state, setState] = useState<IngestState | null>(null);
  const [auto, setAuto] = useState(true);
  const [directOnly, setDirectOnly] = useState(false);
  const [airline, setAirline] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/ingest", { cache: "no-store" });
      const json = (await res.json()) as IngestState;
      setState(json);
      setError(null);
    } catch {
      setError("無法讀取攔截資料（網頁伺服器有開嗎？）");
    }
  }, []);

  async function clearAll() {
    await fetch("/api/ingest", { method: "DELETE" });
    refresh();
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [auto, refresh]);

  const all = state?.itineraries ?? [];
  const airlines = useMemo(() => availableAirlines(all), [all]);
  const filtered = useMemo(
    () =>
      applyFilters(all, {
        directOnly,
        ...(airline !== "ALL" ? { airlines: [airline] } : {}),
      }),
    [all, directOnly, airline],
  );
  const table = useMemo(() => buildComparison(filtered), [filtered]);
  const flights = useMemo(
    () => [...filtered].sort((a, b) => a.price - b.price).slice(0, 12),
    [filtered],
  );

  return (
    <main className="container">
      <p style={{ marginBottom: 8 }}>
        <a href="/">← 回反向比價</a>
      </p>
      <h1 className="title">🛰️ Skyscanner 攔截結果</h1>
      <p className="subtitle">
        由瀏覽器擴充攔截 Skyscanner 搜尋回應 → 正規化 → 同一套比價表。資料顯示用，訂票走
        Trip.com（你賺回饋）。
      </p>

      <div className="callout warn">
        ⚠️ 攔截 Skyscanner 屬個人研究用途，請勿商業再散布。商業版資料源請用網站首頁的 Amadeus。
      </div>

      <div className="panel">
        <div className="row">
          <strong>
            已攔截 {state?.count ?? 0} 筆
            {state?.updatedAt
              ? `（更新於 ${new Date(state.updatedAt).toLocaleTimeString("zh-TW")}）`
              : ""}
          </strong>
          <button type="button" className="btn-secondary" onClick={refresh}>
            重新整理
          </button>
          <label style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}>
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
              style={{ width: "auto" }}
            />
            自動更新 (5s)
          </label>
          <button type="button" className="btn-secondary" onClick={clearAll}>
            清除
          </button>
        </div>
        {error && <p className="error" style={{ marginTop: 10 }}>⚠️ {error}</p>}
      </div>

      {all.length === 0 ? (
        <div className="panel">
          <p className="muted">
            還沒有攔截資料。安裝 <code>extension/</code>（chrome://extensions →
            開發者模式 → 載入未封裝），在擴充的彈出視窗把「網頁接收網址」設為{" "}
            <code>http://localhost:3000/api/ingest</code>，然後到 Skyscanner 搜尋一次即可。
          </p>
        </div>
      ) : (
        <>
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
          </div>

          <div className="panel">
            <strong>航班（依價格）</strong>
            <div className="flights-list" style={{ marginTop: 12 }}>
              {flights.map((it, idx) => (
                <div
                  key={it.id}
                  className={`flight-card${idx === 0 ? " is-cheapest" : ""}`}
                >
                  <div>
                    <div>
                      {idx === 0 && <span className="star">★ </span>}
                      <strong>{it.carrier}</strong>
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
                      href={bookingHref(it)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      前往 Trip.com 訂票
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
