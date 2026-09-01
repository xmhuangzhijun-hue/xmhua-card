import type { Metadata } from "next";
import { themeBootstrapScript } from "@/components/site/browser-store";
import "./globals.css";
import "./hooosberg-source.css";

export const metadata: Metadata = {
  title: { default: "XMHUA", template: "%s" },
  description: "AI 产品、Agent、数据工具与长期构建记录。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint so dark mode does not flash light. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
