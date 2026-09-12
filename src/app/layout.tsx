import type { Metadata } from "next";
import { themeBootstrapScript } from "@/components/site/browser-store";
import { CommandPalette } from "@/components/site/command-palette";
import { MotionRoot } from "@/components/site/motion-root";
import "./globals.css";
import "./hooosberg-source.css";
import "./motion.css";
import "./design.css";
import "./studio.css";
import "./experience.css";
import "./constellation.css";
import "./github-status.css";

export const metadata: Metadata = {
  title: { default: "黄智军", template: "%s" },
  description: "AI 产品、Agent、数据工具与长期构建记录。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint so dark mode does not flash light. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        {children}
        {/* Mounted once at the root: the palette is reachable from every page,
            and the motion layer wires reveal + spotlight for whatever renders. */}
        <MotionRoot />
        <CommandPalette />
      </body>
    </html>
  );
}
