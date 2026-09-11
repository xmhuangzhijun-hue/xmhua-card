import Link from "next/link";
import { ArrowRight, BookOpen, CodeXml, Layers, Search, ShieldCheck } from "lucide-react";
import { isLiveHref, type SectionHeading, type SiteContent } from "@/lib/content-types";
import { stripInlineMarkdown } from "@/lib/markdown";
import { AnalyticsConsent } from "./analytics-consent";
import { SocialGrid } from "./social-grid";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { KnowledgeOrbit } from "./knowledge-orbit";
import { NoteDiscovery } from "./note-discovery";
import { Waves } from "../react-bits/Waves";
import { GradientText } from "../react-bits/GradientText";
import { StarBorder } from "../react-bits/StarBorder";

const directoryIcons = { search: Search, code: CodeXml, layers: Layers, shield: ShieldCheck };

function Heading({ eyebrow, title, description, action, center = false }: SectionHeading & { center?: boolean }) {
  return (
    <div className={`section-heading${center ? " section-heading--center" : ""}`}>
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <span>{description}</span>
      {!center && action && isLiveHref(action.href) && (
        <a href={action.href}>{action.label} <ArrowRight size={15} /></a>
      )}
    </div>
  );
}

export function HomePage({ content }: { content: SiteContent }) {
  const { hero, sections, products, directory, author, socials, site, ui } = content;
  const previews = content.articles.map(({ id, category, title, excerpt, publishedAt, slug }) => ({ id, category, title, excerpt: stripInlineMarkdown(excerpt), publishedAt, slug }));

  return (
    <>
      <SiteHeader content={content} />
      <main className="studio-home">
        <section className="landing-hero">
          <Waves lineColor="rgba(105,178,240,.3)" xGap={22} waveAmpX={45} waveAmpY={28} waveSpeedX={.025} waveSpeedY={.015} />
          <div className="hero-grid" />
          <div className="hero-content">
            <p className="hero-kicker">{hero.kicker}</p>
            <h1><GradientText>{hero.title}</GradientText></h1>
            <p className="hero-subtitle">
              {hero.description.split("\n").map((line, index) => (
                <span key={line}>{index > 0 && <br />}{line}</span>
              ))}
            </p>
            <div className="hero-actions">
              {isLiveHref(hero.primaryAction.href) && (
                <StarBorder className="hero-star-action" href={hero.primaryAction.href}>
                  <BookOpen size={18} />{hero.primaryAction.label}
                </StarBorder>
              )}
              {isLiveHref(hero.secondaryAction.href) && (
                <a className="button button--secondary button--xl" href={hero.secondaryAction.href}>
                  <Search size={18} />{hero.secondaryAction.label}
                </a>
              )}
            </div>
            <div className="hero-proof">{hero.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
          </div>
          <KnowledgeOrbit notes={content.articles.length} projects={products.length} />
        </section>

        <section className="landing-section landing-section--split" id="articles" data-reveal>
          <Heading {...sections.articles} />
          <NoteDiscovery articles={previews} />
        </section>

        <section className="landing-section home-products-section" id="products" data-reveal>
          <Heading {...sections.products} />
          <div className="product-grid product-grid--catalog product-grid--home">
            {products.map(product => (
              <article className="product-card mo-spot mo-lift" key={product.id}>
                <div className="product-card__top">
                  <span className="product-icon product-icon--md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.image} alt="" />
                  </span>
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.subtitle}</p>
                  </div>
                </div>
                <p className="product-card__summary">{product.summary}</p>
                <div className="product-card__meta"><span>{product.platform}</span></div>
                {/* A product without a destination shows its description only, never a link to nowhere. */}
                {isLiveHref(product.href) && (
                  <div className="product-card__actions">
                    <a className="text-action product-card__button" href={product.href}>
                      {ui.productStoreLabel} <ArrowRight size={15} />
                    </a>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section home-directory-section" id="ai-navigation">
          <Heading {...sections.directory} center />
          <div className="home-directory-panel">
            <div className="home-directory-intro">
              <div>
                <p className="home-directory-kicker">{directory.kicker}</p>
                <h3>{directory.title}</h3>
                <p>{directory.description}</p>
              </div>
              <div className="home-directory-actions">
                {isLiveHref(directory.primaryAction.href) && (
                  <a className="button button--primary" href={directory.primaryAction.href}>
                    {directory.primaryAction.label} <ArrowRight size={17} />
                  </a>
                )}
                {isLiveHref(directory.secondaryAction.href) && (
                  <a className="button button--secondary" href={directory.secondaryAction.href}>
                    {directory.secondaryAction.label}
                  </a>
                )}
              </div>
            </div>
            <div className="home-directory-card-grid">
              {directory.links.map(link => {
                const Icon = directoryIcons[link.icon];
                const body = (
                  <>
                    <span className="home-directory-icon"><Icon size={20} /></span>
                    <strong>{link.title}</strong>
                    <p>{link.description}</p>
                  </>
                );
                return isLiveHref(link.href)
                  ? <a className="home-directory-card" href={link.href} key={link.id}>{body}</a>
                  : <div className="home-directory-card" key={link.id}>{body}</div>;
              })}
            </div>
          </div>
        </section>

        <section className="author-section" id="about">
          <div className="author-card">
            <div className="author-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={site.brandImage} alt="" />
            </div>
            <div>
              <p className="hero-kicker">{author.kicker}</p>
              <h2>{author.title}</h2>
              <div className="author-card__copy">
                {author.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                {content.pages.some(page => page.slug === "about") && (
                  <p><Link href="/about">关于{site.brandName}与这个博客 <ArrowRight size={15} /></Link></p>
                )}
              </div>
            </div>
          </div>
          {socials.length > 0 && <SocialGrid socials={socials} />}
        </section>
      </main>
      <SiteFooter content={content} />
      <AnalyticsConsent analytics={ui.analytics} />
    </>
  );
}
