import type { Metadata } from "next";
import "./globals.css";
import "./hooosberg-source.css";

export const metadata: Metadata = {
  title: "湖森堡AI_hooosberg | 哲学 艺术 AI",
  description: "Hooosberg homepage frontend emulation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
