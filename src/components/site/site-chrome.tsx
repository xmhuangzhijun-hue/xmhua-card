import Link from "next/link";
import { ArrowUpRight, Megaphone } from "lucide-react";
import { isLiveHref, type SiteContent } from "@/lib/content-types";
import { ThemeToggle } from "./theme-toggle";

/**
 * Header and footer shared by every public page.
 *
 * Placeholder destinations are never rendered as links: an entry the owner has
 * not filled in yet is dropped instead of shipping as a link that goes nowhere.
 */
export function SiteHeader({ content }: { content: SiteContent }) {
  const { site, ui } = content;
  const navigation = site.navigation.filter(link => isLiveHref(link.href));
  const moreLinks = ui.moreLinks.filter(link => isLiveHref(link.href));

  return (
    <header className="site-header">
      {site.announcement && (
        <aside className="site-announcement">
          <div className="site-announcement__inner">
            <Megaphone size={16} />
            <p>
              {site.announcement}{" "}
              {isLiveHref(site.announcementLink.href) && (
                <a href={site.announcementLink.href}>
                  {site.announcementLink.label} <ArrowUpRight size={13} />
                </a>
              )}
              {site.announcementCode && <code>{site.announcementCode}</code>}
              {site.announcementSuffix}
            </p>
          </div>
        </aside>
      )}
      <div className="site-header__inner">
        <Link className="brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src={site.brandImage} alt="" />
          <strong>{site.brandName}</strong>
        </Link>
        <div className="site-header__right">
          <nav className="nav-links">
            {navigation.map(link => (
              <a href={link.href} key={`${link.label}-${link.href}`}>{link.label}</a>
            ))}
            {moreLinks.length > 0 && (
              <details className="nav-more">
                <summary>{ui.moreLabel}</summary>
                <div className="nav-more__menu">
                  {moreLinks.map(link => <a href={link.href} key={link.label}>{link.label}</a>)}
                </div>
              </details>
            )}
          </nav>
          <div className="site-header__actions">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ content }: { content: SiteContent }) {
  const { site, socials, footer, ui, pages } = content;
  const legalLinks = footer.legalLinks.filter(link => isLiveHref(link.href));
  const knownPages = new Set(pages.map(page => `/${page.slug}`));

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <strong>{site.brandName}</strong>
          <p>{footer.description}</p>
        </div>
        <nav className="site-footer__social">
          {/* QR-only entries have no destination to link to; they live in the About grid. */}
          {socials.filter(social => isLiveHref(social.href)).map(social => (
            <a href={social.href} key={social.id} target="_blank" rel="noreferrer noopener">{social.label}</a>
          ))}
          {socials.some(social => social.kind === "qrcode") && <a href="#about">微信 / 扫码</a>}
          {isLiveHref(ui.emailLink.href) && <a href={ui.emailLink.href}>{ui.emailLink.label}</a>}
        </nav>
        <nav className="site-footer__legal">
          {legalLinks.map(link =>
            knownPages.has(link.href)
              ? <Link href={link.href} key={link.label}>{link.label}</Link>
              : <a href={link.href} key={link.label}>{link.label}</a>)}
        </nav>
        <p className="site-footer__note">
          {footer.note} <span>{footer.copyright}</span>
        </p>
      </div>
    </footer>
  );
}
