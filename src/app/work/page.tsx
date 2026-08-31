import type { Metadata } from "next";
import { WorkShowcase } from "@/components/work-showcase";
import "./work.css";

export const metadata: Metadata = {
  title: "AI 实战案例 | XMHUA",
  description: "Hermes、Obsidian、AI 编程协作、广告数据产品与个人博客平台的真实工程案例。",
};

export default function WorkPage() {
  return <WorkShowcase />;
}
