"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, CodeXml, ExternalLink, Layers, Megaphone, Moon, Search, ShieldCheck, Sun } from "lucide-react";

const articles = [
  ["架构实现", "WitNote 智简笔记 · 08 · 2.0.1 重构：Swift 原生工作台与本地 MLX 架构", "这次不是重新做一个 App，而是在原有 App Store 产品上完成一次 Swift 原生、端侧 AI 和工作台结构的系统重构。", "2026-08-05"],
  ["产品复盘", "WitNote 智简笔记 · 01 · 立项：为什么做本地优先 AI 写作工具", "WitNote 的起点不是再做一个笔记本，而是给写作者一个本地可控的 AI 工作台。", "2026-06-20"],
  ["产品复盘", "DrowseBook 入梦书 · 01 · 立项调研：为什么做一个睡前听书阅读器", "从头部听书产品的差评、移动场景和买断机会，判断 DrowseBook 为什么值得做。", "2026-06-20"],
  ["产品复盘", "Sumi Mahjong 禅艺麻将 · 01 · 立项调研：为什么从麻将消除开始做游戏矩阵", "从关键词、头部产品、差评密度、能力匹配和商业模型判断一个小游戏是否值得做。", "2026-06-20"],
  ["产品复盘", "WitNote 智简笔记 · 02 · 开发哲学：从认真写作者的本能出发", "写作者需要的是可回到原稿、可掌控上下文、可长期维护的工作流。", "2026-06-19"],
  ["产品复盘", "DrowseBook 入梦书 · 02 · 开发哲学：安静工具类 iOS App 如何表达价值", "睡前听书、文件导入、TTS 和隐私边界，如何构成一个清晰的生活工具产品。", "2026-06-19"],
];

const products = [
  ["mood-button.png", "Mood Button", "本地 AI 情绪日记", "基于 Apple MLX 和 Qwen3 的 iPhone 本地 AI 语音情绪日记。", "iPhone / iPad"],
  ["sumi-mahjong.png", "Sumi Mahjong 禅艺麻将", "安静解谜游戏", "安静的 iPhone 与 iPad 麻将连连看，使用手调水墨牌面，支持离线配对，可选一次买断解锁主题。", "iPhone / iPad"],
  ["drowsebook.png", "DrowseBook 入梦书", "睡前听书阅读器", "iPhone 上的睡前听书和本地阅读工具，支持 EPUB、PDF、TXT、MOBI、AZW3、Apple TTS、环境音和睡眠计时。", "iPhone / iOS"],
];

const socials = [["github.svg","GitHub","hooosberg"],["x.svg","X","@hooosberg"],["youtube.svg","YouTube","@hooosberg"],["tiktok.svg","TikTok","@hooosberg"],["telegram.svg","Telegram","@hooosberg"],["douyin.svg","抖音","湖森堡AI_hooosberg"],["kuaishou.svg","快手","湖森堡AI_hooosberg"],["xiaohongshu.svg","小红书","湖森堡AI_hooosberg"],["bilibili.svg","B站","湖森堡AI_hooosberg"]];

function Heading({ eyebrow, title, copy, center=false }: { eyebrow:string; title:string; copy:string; center?:boolean }) {
  return <div className={`section-heading${center ? " section-heading--center" : ""}`}><p>{eyebrow}</p><h2>{title}</h2><span>{copy}</span>{!center && <a href="#">全部{eyebrow} <ArrowRight size={15}/></a>}</div>;
}

export function HooosbergClone() {
  const [consent,setConsent]=useState(true);
  const [dark,setDark]=useState(false);
  useEffect(()=>{ document.documentElement.dataset.theme=dark ? "dark" : "light"; },[dark]);
  const iconRoot="/sites/hooosberg-com-db2980a2/root-8a5edab2/icons";
  const imageRoot="/sites/hooosberg-com-db2980a2/root-8a5edab2/images";
  const brand="/sites/hooosberg-com-db2980a2/shared/brand/hooosberg-ai-icon.png";
  return <>
    <header className="site-header">
      <aside className="site-announcement"><div className="site-announcement__inner"><Megaphone size={16}/><p>给大家搞来一个福利：如果你对海外顶级模型感兴趣，推荐试试 Cola，访问 <a href="https://colaos.ai">colaos.ai <ArrowUpRight size={13}/></a> 开始体验。内置 ChatGPT、Claude Code 等顶尖模型；推荐码：<code>HU-U7DSEXZJ</code>，填写后可领取 3 天免费体验。注册、使用和支付都可在国内完成，支持支付宝。</p></div></aside>
      <div className="site-header__inner"><a className="brand" href="#"><img className="brand-mark" src={brand} alt=""/><strong>湖森堡AI_hooosberg</strong></a><div className="site-header__right"><nav className="nav-links"><a href="#articles">笔记</a><a href="#products">产品</a><a href="#ai-navigation">AI导航</a><a href="#about">联系</a><a href="#">定制服务</a><details className="nav-more"><summary>其他</summary><div className="nav-more__menu"><a href="#">课程</a></div></details></nav><div className="site-header__actions"><a className="language-switch" href="#">EN</a><button className="theme-toggle" onClick={()=>setDark(!dark)} aria-label="切换黑白主题">{dark?<Sun size={17}/>:<Moon size={17}/>}</button></div></div></div>
    </header>
    <main>
      <section className="landing-hero"><div className="hero-grid"/><div className="hero-content"><p className="hero-kicker">我的开发笔记 / AI 工具导航</p><h1>哲学 艺术 AI</h1><p className="hero-subtitle">这里记录我用 AI 做真实产品的过程，也整理实际用过和调研过的 AI 工具。<br/>你可以从这里看产品怎么从想法走到发布，也可以快速判断当下该用哪个 AI 工具。</p><div className="hero-actions"><a className="button button--primary button--xl" href="#articles"><BookOpen size={18}/>看笔记</a><a className="button button--secondary button--xl" href="#ai-navigation"><Search size={18}/>打开 AI 导航</a></div><div className="hero-proof">{["Codex App 开发","苹果商店上架流程","Mac/iOS App 开发","AI 入门","Claude Code","Gemini","AI 导航","开发笔记"].map(x=><span key={x}>{x}</span>)}</div></div></section>
      <section className="landing-section landing-section--split" id="articles"><Heading eyebrow="开发笔记" title="先看真实产品怎么被做出来。" copy="这里不是概念教程，而是需求、提示词、代码修改、上架、失败和复盘的连续记录。"/><div className="article-list article-list--compact">{articles.map((a,i)=><a className="article-row" href="#" key={i}><span className="article-row__category">{a[0]}</span><span className="article-row__title">{a[1]}</span><span className="article-row__excerpt">{a[2]}</span><span className="article-row__date">{a[3]}</span></a>)}</div></section>
      <section className="landing-section home-products-section" id="products"><Heading eyebrow="产品" title="产品是笔记的事实来源。" copy="保留少量代表项目入口，更多产品和隐私政策放在产品页里统一查看。"/><div className="product-grid product-grid--catalog product-grid--home">{products.map(p=><article className="product-card" key={p[1]}><div className="product-card__top"><span className="product-icon product-icon--md"><img src={`${imageRoot}/${p[0]}`} alt=""/></span><div><h3>{p[1]}</h3><p>{p[2]}</p></div></div><p className="product-card__summary">{p[3]}</p><div className="product-card__meta"><span>{p[4]}</span><span>App Store</span></div><div className="product-card__actions"><a className="text-action product-card__button" href="#">App Store</a><a className="text-action product-card__button" href="#">开发笔记 <ArrowRight size={15}/></a></div></article>)}</div></section>
      <section className="landing-section home-directory-section" id="ai-navigation"><Heading eyebrow="AI 导航" title="先选对工具。" copy="主流工具、国内平替、开发资源和学习资料都放进一页，按场景快速跳转。" center/><div className="home-directory-panel"><div className="home-directory-intro"><div><p className="home-directory-kicker">快速入口</p><h3>排行榜、平替、资源入口。</h3><p>导航页会持续整理我实际使用或完整调研过的工具：AI 编程、模型接口、产品原型、设计创作、开发托管、分发推广和免费学习资源，方便你按场景直接跳转。</p></div><div className="home-directory-actions"><a className="button button--primary" href="#">进入 AI 导航 <ArrowRight size={17}/></a><a className="button button--secondary" href="#">看顶级产品榜</a></div></div><div className="home-directory-card-grid">{[[Search,"AI 工具排行榜","从 ChatGPT、Claude、Gemini 到国内主流工具，先看最值得反复使用的入口。"],[CodeXml,"开发者工具链","模型接口、开发托管、原型设计和分发推广，适合做产品前快速选型。"],[Layers,"国内平替对照","把国际主流产品和国内可用工具放在一起，方便判断该用哪个替代。"],[ShieldCheck,"长期学习资源","只放值得长期看的免费课程和一线资料，给后续课程与项目打基础。"]].map(([Icon,title,copy])=><a className="home-directory-card" href="#" key={String(title)}><span className="home-directory-icon"><Icon size={20}/></span><strong>{String(title)}</strong><p>{String(copy)}</p></a>)}</div></div></section>
      <section className="author-section" id="about"><div className="author-card"><div className="author-mark"><img src={brand} alt=""/></div><div><p className="hero-kicker">关于湖森堡AI_hooosberg</p><h2>一个在艺术、建筑和技术之间做产品的独立开发者。</h2><div className="author-card__copy"><p>我毕业于美术学院，本身学的是建筑设计，也长期喜欢研究技术和编程。过去做过 3D 打印，拍过户外纪录片，也一直在把空间、影像、工具和产品开发放在同一个系统里思考。</p><p>现在我正在 all in AI。2026 上半年已经开发并发布了十多个产品，目标是今年完成 20 个，慢慢形成稳定的海外收入。这是我的梦想，这个网站会记录路上的产品、课程、核心文件、AI 对话和复盘，也希望把这场历险一路分享给你。</p></div></div></div><div className="social-card-grid">{socials.map(s=><a className="social-card" href="#" key={s[1]}><img className="social-card__icon" src={`${iconRoot}/${s[0]}`} alt=""/><span>{s[1]}</span><strong>{s[2]}</strong><ExternalLink className="social-card__external" size={14}/></a>)}</div></section>
    </main>
    <footer className="site-footer"><div className="site-footer__inner"><div className="site-footer__brand"><strong>湖森堡AI_hooosberg</strong><p>真实项目教程、独立 App、AI 工具和长期产品记录。</p></div><nav className="site-footer__social">{["GitHub","X","YouTube","TikTok","Telegram","抖音","快手","小红书","B站","Email"].map(x=><a href="#" key={x}>{x}</a>)}</nav><nav className="site-footer__legal"><a href="#">隐私政策</a><a href="#">服务条款</a><a href="#">Cookie 说明</a></nav><p className="site-footer__note">这里记录公开项目、AI 教程和产品页面。隐私、服务条款与网站统计说明以底部对应页面为准。 <span>© 2026 Hooosberg.</span></p></div></footer>
    {consent&&<div className="analytics-consent"><div className="analytics-consent__copy"><strong>网站统计选择</strong><p>我们只会在你同意后加载 Google Analytics，用来了解访问情况并改进网站。</p><div className="analytics-consent__links"><a href="#">隐私政策</a><a href="#">Cookie 说明</a></div></div><div className="analytics-consent__actions"><button className="button button--secondary" onClick={()=>setConsent(false)}>拒绝</button><button className="button button--primary" onClick={()=>setConsent(false)}>同意统计</button></div></div>}
  </>;
}
