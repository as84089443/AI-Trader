import { getBoards } from "@/lib/boards";
import { BoardTable } from "@/components/BoardTable";

// ISR: regenerate at most once per day. The data API is hit during that daily
// regeneration only; every visitor is served the cached snapshot. No cron, no
// consumer extension.
export const revalidate = 86400;

export const metadata = {
  title: "每日機票比價表 — Flight Finder",
};

export default async function BoardsPage() {
  const { boards, generatedAt, demo, departMonth } = await getBoards();
  const updated = new Date(generatedAt).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
  });

  return (
    <main className="container">
      <p style={{ marginBottom: 8 }}>
        <a href="/">← 互動搜尋</a>
        {"　"}
        <a href="/four-leg">外站四段票試算 →</a>
      </p>
      <h1 className="title">📅 每日機票比價表</h1>
      <p className="subtitle">
        每天自動更新一次的最低價看板（{departMonth} 出發）。免裝任何外掛，點「訂票」用
        Trip.com 下單即可。
      </p>

      {demo && (
        <div className="callout warn">
          <span className="tag demo">DEMO</span> 目前顯示範例資料（未設定
          Travelpayouts 金鑰）。在環境變數加 <code>TRAVELPAYOUTS_TOKEN</code>{" "}
          後，每日會自動換成真實最低價。
        </div>
      )}

      {boards.map((board) => (
        <BoardTable key={board.id} board={board} />
      ))}

      <p className="muted" style={{ marginTop: 12 }}>
        資料更新時間：{updated}（每 24 小時自動刷新）。價格為快取最低價，點過去
        Trip.com 可能微幅變動；訂票連結帶推薦碼，你的回饋照算。
      </p>
    </main>
  );
}
