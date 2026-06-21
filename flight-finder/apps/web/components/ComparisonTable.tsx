import type { ComparisonTable as ComparisonTableData } from "@flight-finder/core";

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

export function ComparisonTable({ data }: { data: ComparisonTableData }) {
  if (data.rows.length === 0) {
    return <p className="muted">沒有可比較的資料。</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            <th>出發地 \ 日期</th>
            {data.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {row.cells.map((cell, i) => {
                const key = `${row.label}-${data.columns[i]}`;
                if (!cell) {
                  return (
                    <td key={key} className="muted">
                      —
                    </td>
                  );
                }
                return (
                  <td key={key} className={cell.isOverallCheapest ? "cheapest" : ""}>
                    <div className="price">
                      {cell.isOverallCheapest && <span className="star">★ </span>}
                      {fmt(cell.cheapest, cell.currency)}
                    </div>
                    <div className="muted">{cell.cheapestCarrier}</div>
                    {cell.secondCheapest != null && (
                      <div className="muted">
                        次低 {fmt(cell.secondCheapest, cell.currency)}（
                        {cell.secondCheapestCarrier}）
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
