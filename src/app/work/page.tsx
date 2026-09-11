import type { Metadata } from "next";
import { getSiteContent } from "@/lib/api-client";
import { WorkShowcase } from "@/components/work-showcase";
import "./work.css";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/work") },
  title: "AI 实战案例 | 黄智军",
  description: "Hermes、Obsidian、AI 编程协作、广告数据产品与个人博客平台的真实工程案例。",
};

export const revalidate = 60;

export default async function WorkPage() {
  return <WorkShowcase content={await getSiteContent()} />;
}
