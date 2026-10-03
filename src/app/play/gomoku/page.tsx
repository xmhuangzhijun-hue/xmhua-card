import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GomokuGame } from "@/components/gomoku-game";
import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import { getSiteContent } from "@/lib/api-client";
import { pageMetadata } from "@/lib/seo";
import "./gomoku.css";

export const metadata = pageMetadata("五子棋 · 和朋友一起落子", "免登录创建棋房，把链接发给朋友，在线一起下五子棋。也可以在同一台设备上双人练习。", "/play/gomoku");

export default async function GomokuPage({ searchParams }: {
  searchParams: Promise<{ room?: string | string[] }>;
}) {
  const [content, query] = await Promise.all([getSiteContent(), searchParams]);
  const requestedRoom = typeof query.room === "string" ? query.room.trim().toUpperCase() : "";
  const initialRoom = /^[A-Z2-9]{8}$/.test(requestedRoom) ? requestedRoom : "";
  return <>
    <SiteHeader content={content} compact />
    <main className="gomoku-page">
      <Link className="gomoku-back" href="/work"><ArrowLeft size={15} /> 返回作品</Link>
      <div className="gomoku-heading">
        <div><p className="gomoku-eyebrow">一个链接，一张棋盘</p><h1>和朋友，一起落子。</h1><p className="gomoku-intro">不用注册，邀个朋友来一盘五子棋。黑棋先手，连成五子就赢。</p></div>
        <span className="gomoku-heading-mark" aria-hidden="true"><i /><i /></span>
      </div>
      <GomokuGame key={initialRoom || "practice"} initialRoom={initialRoom} invalidRoom={Boolean(requestedRoom && !initialRoom)} />
    </main>
    <SiteFooter content={content} />
  </>;
}
