"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, CodeXml, ExternalLink, Layers, Megaphone, Moon, Search, ShieldCheck, Sun } from "lucide-react";
import { homepageContentSchema, type HomepageContent } from "@/lib/content-schema";

function Heading({ eyebrow, title, description, center=false }: { eyebrow:string; title:string; description:string; center?:boolean }) {
  return <div className={`section-heading${center ? " section-heading--center" : ""}`}><p>{eyebrow}</p><h2>{title}</h2><span>{description}</span>{!center && <a href="#">全部{eyebrow} <ArrowRight size={15}/></a>}</div>;
}

export function HooosbergClone() {
  const [consent,setConsent]=useState(true);
  const [dark,setDark]=useState(false);
  const [content,setContent]=useState<HomepageContent | null>(null);
  const [error,setError]=useState(false);
  useEffect(()=>{ document.documentElement.dataset.theme=dark ? "dark" : "light"; },[dark]);
  useEffect(()=>{
    const controller=new AbortController();
    const tenant=new URLSearchParams(window.location.search).get("tenant");
    fetch(`/api/content${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ""}`,{signal:controller.signal})
      .then(async response=>{ if(!response.ok) throw new Error("content request failed"); return response.json(); })
      .then(payload=>{
        setContent(homepageContentSchema.parse(payload.data));
        document.documentElement.dataset.contentSource=String(payload.meta?.source ?? "unknown");
      })
      .catch(fetchError=>{ if(fetchError.name!=="AbortError") setError(true); });
    return ()=>controller.abort();
  },[]);
  if(error) return <main className="content-state"><h1>内容暂时不可用</h1><p>请稍后刷新页面。</p></main>;
  if(!content) return <main className="content-state" aria-busy="true"><p>正在读取内容…</p></main>;
  const {site,hero,sections,articles,products,directory,author,socials,footer}=content;
  const directoryIcons={search:Search,code:CodeXml,layers:Layers,shield:ShieldCheck};
  return <>
    <header className="site-header">
      <aside className="site-announcement"><div className="site-announcement__inner"><Megaphone size={16}/><p>{site.announcement} <a href={site.announcementLink.href}>{site.announcementLink.label} <ArrowUpRight size={13}/></a> 开始体验。内置 ChatGPT、Claude Code 等顶尖模型；推荐码：<code>{site.announcementCode}</code>，填写后可领取 3 天免费体验。注册、使用和支付都可在国内完成，支持支付宝。</p></div></aside>
      <div className="site-header__inner"><a className="brand" href="#"><img className="brand-mark" src={site.brandImage} alt=""/><strong>{site.brandName}</strong></a><div className="site-header__right"><nav className="nav-links">{site.navigation.map(link=><a href={link.href} key={link.label}>{link.label}</a>)}<details className="nav-more"><summary>其他</summary><div className="nav-more__menu"><a href="#">课程</a></div></details></nav><div className="site-header__actions"><a className="language-switch" href="#">EN</a><button className="theme-toggle" onClick={()=>setDark(!dark)} aria-label="切换黑白主题">{dark?<Sun size={17}/>:<Moon size={17}/>}</button></div></div></div>
    </header>
    <main>
      <section className="landing-hero"><div className="hero-grid"/><div className="hero-content"><p className="hero-kicker">{hero.kicker}</p><h1>{hero.title}</h1><p className="hero-subtitle">{hero.description.split("\n").map((line,index)=><span key={line}>{index>0&&<br/>}{line}</span>)}</p><div className="hero-actions"><a className="button button--primary button--xl" href={hero.primaryAction.href}><BookOpen size={18}/>{hero.primaryAction.label}</a><a className="button button--secondary button--xl" href={hero.secondaryAction.href}><Search size={18}/>{hero.secondaryAction.label}</a></div><div className="hero-proof">{hero.tags.map(tag=><span key={tag}>{tag}</span>)}</div></div></section>
      <section className="landing-section landing-section--split" id="articles"><Heading {...sections.articles}/><div className="article-list article-list--compact">{articles.map(article=><a className="article-row" href={article.href} key={article.id}><span className="article-row__category">{article.category}</span><span className="article-row__title">{article.title}</span><span className="article-row__excerpt">{article.excerpt}</span><span className="article-row__date">{article.publishedAt}</span></a>)}</div></section>
      <section className="landing-section home-products-section" id="products"><Heading {...sections.products}/><div className="product-grid product-grid--catalog product-grid--home">{products.map(product=><article className="product-card" key={product.id}><div className="product-card__top"><span className="product-icon product-icon--md"><img src={product.image} alt=""/></span><div><h3>{product.name}</h3><p>{product.subtitle}</p></div></div><p className="product-card__summary">{product.summary}</p><div className="product-card__meta"><span>{product.platform}</span><span>App Store</span></div><div className="product-card__actions"><a className="text-action product-card__button" href={product.href}>App Store</a><a className="text-action product-card__button" href={product.href}>开发笔记 <ArrowRight size={15}/></a></div></article>)}</div></section>
      <section className="landing-section home-directory-section" id="ai-navigation"><Heading {...sections.directory} center/><div className="home-directory-panel"><div className="home-directory-intro"><div><p className="home-directory-kicker">{directory.kicker}</p><h3>{directory.title}</h3><p>{directory.description}</p></div><div className="home-directory-actions"><a className="button button--primary" href={directory.primaryAction.href}>{directory.primaryAction.label} <ArrowRight size={17}/></a><a className="button button--secondary" href={directory.secondaryAction.href}>{directory.secondaryAction.label}</a></div></div><div className="home-directory-card-grid">{directory.links.map(link=>{const Icon=directoryIcons[link.icon];return <a className="home-directory-card" href={link.href} key={link.id}><span className="home-directory-icon"><Icon size={20}/></span><strong>{link.title}</strong><p>{link.description}</p></a>})}</div></div></section>
      <section className="author-section" id="about"><div className="author-card"><div className="author-mark"><img src={site.brandImage} alt=""/></div><div><p className="hero-kicker">{author.kicker}</p><h2>{author.title}</h2><div className="author-card__copy">{author.paragraphs.map(paragraph=><p key={paragraph}>{paragraph}</p>)}</div></div></div><div className="social-card-grid">{socials.map(social=><a className="social-card" href={social.href} key={social.id}><img className="social-card__icon" src={social.icon} alt=""/><span>{social.label}</span><strong>{social.handle}</strong><ExternalLink className="social-card__external" size={14}/></a>)}</div></section>
    </main>
    <footer className="site-footer"><div className="site-footer__inner"><div className="site-footer__brand"><strong>{site.brandName}</strong><p>{footer.description}</p></div><nav className="site-footer__social">{socials.map(social=><a href={social.href} key={social.id}>{social.label}</a>)}<a href="#">Email</a></nav><nav className="site-footer__legal">{footer.legalLinks.map(link=><a href={link.href} key={link.label}>{link.label}</a>)}</nav><p className="site-footer__note">{footer.note} <span>{footer.copyright}</span></p></div></footer>
    {consent&&<div className="analytics-consent"><div className="analytics-consent__copy"><strong>网站统计选择</strong><p>我们只会在你同意后加载 Google Analytics，用来了解访问情况并改进网站。</p><div className="analytics-consent__links"><a href="#">隐私政策</a><a href="#">Cookie 说明</a></div></div><div className="analytics-consent__actions"><button className="button button--secondary" onClick={()=>setConsent(false)}>拒绝</button><button className="button button--primary" onClick={()=>setConsent(false)}>同意统计</button></div></div>}
  </>;
}
