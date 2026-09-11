"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowUpRight, BookOpen, CodeXml, Network, Fingerprint } from "lucide-react";
import { KnowledgeOrbit } from "./knowledge-orbit";
import { EffectsToggle, useMotionPaused } from "./effects-toggle";
import { DecryptedText } from "../react-bits/DecryptedText";

/** Native links form the navigation; the scene never gates access to content. */
export function KnowledgeScene({ notes, projects, name, title, description }: { notes: number; projects: number; name: string; title: string; description: string }) {
  const [active, setActive] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const paused = useMotionPaused();
  const destinations = [
    { id: "notes", label: "公开笔记", detail: `${notes} 篇阅读、判断与实践记录`, href: "/notes", icon: BookOpen },
    { id: "projects", label: "正在构建", detail: `${projects} 个公开项目，查看实现与源码`, href: "#products", icon: CodeXml },
    { id: "work", label: "实践案例", detail: "从真实问题出发，查看过程与公开证据", href: "/work", icon: Network },
    { id: "about", label: "关于我", detail: "我的工作方式、关注方向与联系入口", href: "/about", icon: Fingerprint },
  ];
  const current = destinations.find(item => item.id === active);
  return <section className="knowledge-scene" aria-label="探索知识与项目" data-paused={paused}>
    <div className="scene-stars" aria-hidden="true" />
    <header className="scene-heading">
      <p><span className="scene-status" /><DecryptedText text={`${name} / AI 产品与独立开发`} /></p>
      <h1>{title}</h1>
      <p className="scene-intro">{description}</p>
    </header>
    <div className="scene-stage" ref={stage} onPointerMove={event => {
      if (event.pointerType !== "mouse" || paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const box = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--scene-x", `${((event.clientX - box.left) / box.width - .5) * 12}px`);
      event.currentTarget.style.setProperty("--scene-y", `${((event.clientY - box.top) / box.height - .5) * 8}px`);
    }} onPointerLeave={() => { stage.current?.style.setProperty("--scene-x", "0px"); stage.current?.style.setProperty("--scene-y", "0px"); }}>
      <svg className="scene-paths" viewBox="0 0 1000 540" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="500" cy="280" rx="355" ry="150" />
        <ellipse cx="500" cy="280" rx="250" ry="240" transform="rotate(65 500 280)" />
        <path d="M175 160 Q400 150 500 280 T810 345 M240 390 Q410 380 500 280 T800 130" />
        <path className="scene-pulse" d="M175 160 Q400 150 500 280 T810 345 M240 390 Q410 380 500 280 T800 130" />
      </svg>
      <div className="scene-core" aria-hidden="true"><KnowledgeOrbit notes={notes} projects={projects} decorative /><span className="scene-core-label">想法 · 实验 · 产品</span></div>
      <nav className="scene-destinations" aria-label="探索入口">
        {destinations.map(({ id, label, detail, href, icon: Icon }) => <Link key={id} href={href} className={`scene-destination scene-destination--${id}`} onMouseEnter={() => setActive(id)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(id)} onBlur={() => setActive(null)}>
          <span className="scene-sphere"><Icon size={27} strokeWidth={1.3} /></span>
          <strong>{label} <ArrowUpRight size={14} /></strong><span className="scene-node-detail">{detail}</span>
        </Link>)}
      </nav>
    </div>
    <footer className="scene-footer"><div><span className="scene-coordinate">EXPLORE / CONNECT / BUILD</span><p aria-live="polite">{current ? current.detail : "从一个问题出发，让知识走向真实产品。"}</p></div><EffectsToggle /></footer>
  </section>;
}
