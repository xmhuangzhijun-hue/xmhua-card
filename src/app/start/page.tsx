import type { Metadata } from "next";
import { SiteStarter } from "@/components/site-starter";
import "../saas.css";

export const metadata: Metadata = { title: "创建你的博客 · XMHUA" };

export default function StartPage() { return <SiteStarter />; }
