import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "陀螺雷達 | 戰鬥陀螺X 情報追蹤",
  description: "戰鬥陀螺X 即時庫存、發售情報、戰力排行一站查詢",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="max-w-md mx-auto min-h-screen pb-20 bg-[var(--background)] text-[var(--foreground)]">
        <main>{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
