"use client";

import { useEffect, useState } from "react";

export type Heading = { level: number; text: string; id: string };

/**
 * Sticky table of contents for a long document.
 *
 * The list is server-rendered from the same parse that produced the body, so the
 * links work before any JavaScript runs and are crawlable. The only thing this
 * component adds on the client is the highlight that follows the reader.
 */
export function DocOutline({ headings, label = "本页内容" }: { headings: Heading[]; label?: string }) {
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) return;
    const nodes = headings
      .map(heading => document.getElementById(heading.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length === 0) return;

    // A heading counts as current once it reaches the top quarter of the screen;
    // the bottom margin keeps the last section from flickering at page end.
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-12% 0px -70% 0px", threshold: 0 },
    );

    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav className="doc-toc" aria-label={label}>
      <p className="doc-toc__label">{label}</p>
      <ol>
        {headings.map(heading => (
          <li key={heading.id} data-level={heading.level}>
            <a href={`#${encodeURIComponent(heading.id)}`} aria-current={active === heading.id ? "true" : undefined}>
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
