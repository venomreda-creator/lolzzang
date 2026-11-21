import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "RIFT DRILL — 롤 챔피언 연습 도우미",
  description:
    "연습 챔피언과 목표 횟수를 관리하고, Q 사정거리로 상대 챔피언과의 거리 싸움을 학습하며, 이번 주 연습 전적을 한눈에 확인하세요.",
  applicationName: "RIFT DRILL",
  keywords: ["롤", "리그오브레전드", "챔피언", "연습", "사정거리", "전적", "LoL"],
  icons: { icon: "/favicon.svg" },
};

const themeScript = `(function(){try{var raw=localStorage.getItem('riftdrill.theme.v1');var t=raw?JSON.parse(raw):null;if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Rajdhani:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
