import type { Metadata } from "next";
import Script from "next/script";
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
      <body>
        {children}
        {/* Travelpayouts "Drive" verification/monetization tag (id 542200). */}
        <Script id="tp-drive" strategy="afterInteractive">
          {`(function(){var s=document.createElement("script");s.async=1;s.src='https://tpembars.com/NTQyMjAw.js?t=542200';document.head.appendChild(s);})();`}
        </Script>
      </body>
    </html>
  );
}
