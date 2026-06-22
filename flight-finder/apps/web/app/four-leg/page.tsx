"use client";

import { useMemo, useState } from "react";
import {
  compareFourLegPlans,
  evaluateFourLeg,
  FOUR_LEG_WARNING,
  type Cabin,
  type FourLegInput,
} from "@flight-finder/core";

interface Row {
  outer: string;
  label: string;
  fourLegFare: string; // kept as string for input control
  positioningCost: string;
}

const DEFAULT_ROWS: Row[] = [
  { outer: "OKA", label: "沖繩", fourLegFare: "", positioningCost: "" },
  { outer: "KUL", label: "吉隆坡", fourLegFare: "", positioningCost: "" },
  { outer: "CTS", label: "札幌", fourLegFare: "", positioningCost: "" },
  { outer: "BKK", label: "曼谷", fourLegFare: "", positioningCost: "" },
  { outer: "ICN", label: "首爾", fourLegFare: "", positioningCost: "" },
];

function fmt(n: number, currency = "TWD"): string {
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

const today = new Date();
const plus = (days: number) =>
  new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10);

export default function FourLegPage() {
  const [dest, setDest] = useState("VIE");
  const [hub, setHub] = useState("TPE");
  const [departDate, setDepartDate] = useState(plus(60));
  const [returnDate, setReturnDate] = useState(plus(74));
  const [cabin, setCabin] = useState<Cabin>("ECONOMY");
  const [directTwFare, setDirectTwFare] = useState("");
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);

  const direct = Number(directTwFare) || 0;

  const inputs: FourLegInput[] = useMemo(
    () =>
      rows.map((r) => ({
        outerStation: r.outer.toUpperCase(),
        hub: hub.toUpperCase(),
        destination: dest.toUpperCase(),
        fourLegFare: Number(r.fourLegFare) || 0,
        positioningCost: Number(r.positioningCost) || 0,
        directTwFare: direct,
        currency: "TWD",
      })),
    [rows, hub, dest, direct],
  );

  const ranked = useMemo(() => compareFourLegPlans(inputs), [inputs]);
  const best = ranked.find((r) => r.cheaperThanDirect);

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [
      ...prev,
      { outer: "", label: "", fourLegFare: "", positioningCost: "" },
    ]);
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Booking links route through /api/booking for last-click attribution.
  function bookHref(
    from: string,
    to: string,
    sub2: string,
    sub3: string,
  ): string {
    const p = new URLSearchParams({
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      departDate,
      returnDate,
      tripType: "roundtrip",
      adults: "1",
      cabin,
      nonstop: "off",
      sub1: "four-leg",
      sub2,
      sub3,
    });
    return `/api/booking?${p.toString()}`;
  }

  return (
    <main className="container">
      <nav className="crumbs">
        <a href="/">互動搜尋</a>
        <a href="/boards">每日比價表</a>
        <a href="/skyscanner">Skyscanner 攔截</a>
      </nav>
      <h1 className="title">外站四段票試算</h1>
      <p className="subtitle">
        外站→{hub || "樞紐"}→{dest || "目的地"}→{hub || "樞紐"}→外站，四段全搭。
        以較便宜的外站開票，使長程來回比台灣直購省——
        <strong>總成本一定要含「台灣→外站」的自購卡位段</strong>才準。
      </p>

      <div className="callout warn">⚠️ {FOUR_LEG_WARNING}</div>

      <form className="panel" onSubmit={(e) => e.preventDefault()}>
        <div className="form-grid">
          <div>
            <label>目的地 (IATA)</label>
            <input value={dest} maxLength={3} onChange={(e) => setDest(e.target.value)} />
          </div>
          <div>
            <label>樞紐 (你的居住地)</label>
            <input value={hub} maxLength={3} onChange={(e) => setHub(e.target.value)} />
          </div>
          <div>
            <label>去程日期</label>
            <input type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
          </div>
          <div>
            <label>回程日期</label>
            <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
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
          <div>
            <label>台灣直購來回參考價 (TWD)</label>
            <input
              type="number"
              min={0}
              placeholder="例如 31000"
              value={directTwFare}
              onChange={(e) => setDirectTwFare(e.target.value)}
            />
          </div>
        </div>
      </form>

      {best ? (
        <div className="callout">
          💡 目前最省：<strong>{best.outerStation}</strong> 出發，總成本{" "}
          {fmt(best.totalCost)}，比台灣直購省 <strong>{fmt(best.savings)}</strong>。
        </div>
      ) : (
        <div className="callout bad">
          目前填入的組合都沒有比台灣直購便宜（或尚未填入票價）。先用下方連結查實際票價再填。
        </div>
      )}

      <div className="panel">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>外站</th>
                <th>四段票價 (外站↔{dest})</th>
                <th>卡位段來回 ({hub}↔外站)</th>
                <th>查實際票價</th>
                <th>總成本</th>
                <th>省多少</th>
                <th>建議</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const input = inputs[i]!;
                const filled = input.fourLegFare > 0 && input.directTwFare > 0;
                const res = filled ? evaluateFourLeg(input) : null;
                const isBest =
                  best != null && res != null && best.outerStation === res.outerStation;
                return (
                  <tr key={i} className={isBest ? "cheapest" : ""}>
                    <td>
                      <input
                        style={{ width: 70 }}
                        value={r.outer}
                        maxLength={3}
                        placeholder="IATA"
                        onChange={(e) => updateRow(i, { outer: e.target.value })}
                      />
                      {r.label && <div className="muted">{r.label}</div>}
                    </td>
                    <td>
                      <input
                        style={{ width: 110 }}
                        type="number"
                        min={0}
                        value={r.fourLegFare}
                        onChange={(e) => updateRow(i, { fourLegFare: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        style={{ width: 110 }}
                        type="number"
                        min={0}
                        value={r.positioningCost}
                        onChange={(e) =>
                          updateRow(i, { positioningCost: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      {r.outer && dest && (
                        <div style={{ display: "grid", gap: 4 }}>
                          <a
                            className="book-link"
                            href={bookHref(r.outer, dest, `${r.outer}-${dest}`, "four-leg-fare")}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            查四段（{r.outer}↔{dest}）
                          </a>
                          <a
                            className="book-link"
                            href={bookHref(hub, r.outer, `${hub}-${r.outer}`, "positioning")}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            查卡位（{hub}↔{r.outer}）
                          </a>
                        </div>
                      )}
                    </td>
                    <td>{res ? <span className="price">{fmt(res.totalCost)}</span> : "—"}</td>
                    <td>
                      {res ? (
                        <span
                          className="price"
                          style={{ color: res.cheaperThanDirect ? "var(--accent-2)" : "var(--danger)" }}
                        >
                          {res.savings >= 0 ? "省 " : "貴 "}
                          {fmt(Math.abs(res.savings))}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="muted" style={{ maxWidth: 200 }}>
                      {res
                        ? res.cheaperThanDirect
                          ? `${isBest ? "★ 最省　" : ""}划算`
                          : res.notRecommendedReason
                        : "填入票價後試算"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => removeRow(i)}
                        style={{ padding: "4px 8px" }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="button" className="btn-secondary" onClick={addRow}>
            + 新增外站
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          流程：點「查四段 / 查卡位」到 Trip.com 看實際票價（連結帶你的推薦碼）→ 把兩個價格填回表格 →
          立刻看到含卡位段的真實省額與建議。Trip.com 訂票你賺回饋。
        </p>
      </div>
    </main>
  );
}
