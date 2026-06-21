import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flight Finder — 四腿票 / 反向出發地比價",
  description:
    "反向出發地與外站四段票比價工具。資料顯示用，訂票導向 Trip.com。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
