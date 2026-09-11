import Link from "next/link";
import { ArrowRight, CodeXml, Layers, Search, ShieldCheck } from "lucide-react";
import { isLiveHref, type SectionHeading, type SiteContent } from "@/lib/content-types";
import { stripInlineMarkdown } from "@/lib/markdown";
import { AnalyticsConsent } from "./analytics-consent";
import { SocialGrid } from "./social-grid";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { KnowledgeScene } from "./knowledge-scene";
import { NoteDiscovery } from "./note-discovery";
import { SpotlightCard } from "../react-bits/SpotlightCard";
import { GlareHover } from "../react-bits/GlareHover";
import { AnimatedContent } from "../react-bits/AnimatedContent";
import { ProjectIdentity } from "./project-identity";
import { ProjectDescription } from "./project-description";

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
        <KnowledgeScene notes={content.articles.length} projects={products.length} name={site.brandName} title={hero.title} description={hero.description} />

        <section className="landing-section landing-section--split" id="articles">
          <Heading {...sections.articles} />
          <NoteDiscovery articles={previews} />
        </section>

        <section className="landing-section home-products-section" id="products">
          <Heading {...sections.products} />
          <div className="product-grid product-grid--catalog product-grid--home">
            {products.map(product => (
              <AnimatedContent className="product-reveal" key={product.id}><SpotlightCard className="product-card">
                <GlareHover><ProjectIdentity product={product} /></GlareHover>
                <div className="product-card__top">
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.subtitle}</p>
                  </div>
                </div>
                <ProjectDescription text={product.summary} />
                <div className="product-card__meta"><span>{product.platform}</span></div>
                {/* A product without a destination shows its description only, never a link to nowhere. */}
                {isLiveHref(product.href) && (
                  <div className="product-card__actions">
                    <a className="text-action product-card__button" href={product.href}>
                      {ui.productStoreLabel} <ArrowRight size={15} />
                    </a>
                  </div>
                )}
              </SpotlightCard></AnimatedContent>
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
                  ? <SpotlightCard className="capability-tile" key={link.id}><a className="home-directory-card" href={link.href}>{body}</a></SpotlightCard>
                  : <SpotlightCard className="capability-tile" key={link.id}><div className="home-directory-card">{body}</div></SpotlightCard>;
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
