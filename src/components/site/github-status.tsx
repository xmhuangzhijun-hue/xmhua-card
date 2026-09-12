"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiUrl } from "@/lib/api-client";

type Pull = { number: number; title: string; url: string; state: "open" | "merged" | "closed"; mergedVia?: { number: number; url: string } };
type Fact = { repo: string; url: string; stars: number; language: string | null; license: string | null; pushedAt: string | null; release: { tag: string; url: string } | null; pulls?: Pull[]; syncedAt: string };
type Snapshot = { projects: Record<string, Fact>; failed: string[] };
const GithubContext = createContext<Snapshot | null>(null);

export function GithubStatusProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => fetch(apiUrl("/api/github"), { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error("Status unavailable");
      return response.json() as Promise<{ data: Snapshot }>;
    }).then(({ data }) => setSnapshot({ ...data, failed: [...new Set([...data.failed, ...Object.entries(data.projects).filter(([, fact]) => Date.now() - Date.parse(fact.syncedAt) > 2 * 60 * 60 * 1000).map(([repo]) => repo)])] })).catch(() => {
      setSnapshot(previous => previous ? { ...previous, failed: Object.keys(previous.projects) } : previous);
    });
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 5 * 60 * 1000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);
  return <GithubContext.Provider value={snapshot}>{children}</GithubContext.Provider>;
}

export function GithubStatus({ href }: { href: string }) {
  const snapshot = useContext(GithubContext);
  let repo = "";
  try {
    const url = new URL(href);
    if (url.hostname !== "github.com") return null;
    repo = url.pathname.split("/").filter(Boolean).slice(0, 2).join("/").toLowerCase();
  } catch { return null; }
  const fact = snapshot?.projects[repo];
  if (!fact) return <div className="github-status github-status--pending">GitHub 状态暂未同步 · <a href={href}>到 GitHub 查看 ↗</a></div>;
  const stale = snapshot?.failed.includes(repo);
  const adopted = fact.pulls?.filter(pull => pull.mergedVia).length ?? 0;
  const counts = fact.pulls ? { merged: fact.pulls.filter(p => p.state === "merged").length, open: fact.pulls.filter(p => p.state === "open").length, closed: fact.pulls.filter(p => p.state === "closed" && !p.mergedVia).length } : null;
  return <section className="github-status" aria-label={`${fact.repo} GitHub 状态`}>
    <div className="github-status__heading"><a href={fact.url}>GitHub ↗</a><span>{stale ? "同步延迟 · 保留上次数据" : "每小时同步"}</span></div>
    <div className="github-status__facts"><span>★ {fact.stars.toLocaleString("zh-CN")}</span>{fact.language && <span>{fact.language}</span>}{fact.license && fact.license !== "NOASSERTION" && <span>{fact.license}</span>}</div>
    {counts && <><p className="github-status__counts">{fact.pulls!.length} 个 PR · {counts.merged} 已合并{adopted > 0 ? ` · ${adopted} 经关联 PR 合入` : ""} · {counts.open} 开放 · {counts.closed} 关闭</p><details><summary>查看贡献与合入证据</summary><ul>{fact.pulls!.map(pull => <li key={pull.number}><a href={pull.url}>#{pull.number} · {pull.title}</a><span>{pull.state === "merged" ? "已合并" : pull.state === "open" ? "开放" : "已关闭"}{pull.mergedVia && <> · 修复经 <a href={pull.mergedVia.url}>#{pull.mergedVia.number}</a> 合入</>}</span></li>)}</ul></details></>}
    {fact.release && <p>最新 Release：<a href={fact.release.url}>{fact.release.tag} ↗</a></p>}
    {fact.pushedAt && <p>仓库最近推送：<time dateTime={fact.pushedAt}>{fact.pushedAt.slice(0, 10)}</time></p>}
    <small>数据核验于 <time dateTime={fact.syncedAt}>{new Date(fact.syncedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}</time>（UTC+8）</small>
  </section>;
}
