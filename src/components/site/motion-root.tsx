"use client";

import { useEffect } from "react";

/**
 * Mounts the site-wide interaction behaviours exactly once.
 *
 * Everything here is progressive: the page is complete and readable before this
 * runs, and each behaviour checks for its own platform support first. Browsers
 * with native scroll-driven animations never pay for the observer at all.
 */
export function MotionRoot() {
  useEffect(() => {
    const root = document.documentElement;
    const stillness = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (stillness.matches) return;

    const cleanups: (() => void)[] = [];

    // -- reveal ------------------------------------------------------------
    // Only needed where `animation-timeline: view()` is missing; elsewhere the
    // CSS does it off the main thread and this block is skipped entirely.
    const nativeTimeline = CSS.supports("animation-timeline", "view()");
    if (!nativeTimeline) {
      root.classList.add("mo-js");

      // If anything below throws, or an element never intersects, the page must
      // not stay invisible. This is the backstop, not the happy path.
      const failSafe = window.setTimeout(() => {
        document.querySelectorAll("[data-reveal]").forEach(el => el.classList.add("is-in"));
      }, 2500);
      cleanups.push(() => window.clearTimeout(failSafe));

      document.querySelectorAll<HTMLElement>("[data-reveal-stagger]").forEach(group => {
        [...group.children].forEach((child, index) => {
          (child as HTMLElement).style.setProperty("--mo-i", String(Math.min(index, 8)));
        });
      });

      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });

      document.querySelectorAll("[data-reveal]").forEach(el => observer.observe(el));
      cleanups.push(() => observer.disconnect());
    }

    // -- pointer spotlight -------------------------------------------------
    // One delegated listener for the whole document, coalesced to one write per
    // frame. Writing custom properties only repaints; it never triggers layout.
    if (window.matchMedia("(hover: hover)").matches) {
      let frame = 0;
      let pending: { el: HTMLElement; x: number; y: number } | null = null;

      const flush = () => {
        frame = 0;
        if (!pending) return;
        const { el, x, y } = pending;
        el.style.setProperty("--mo-x", `${x}px`);
        el.style.setProperty("--mo-y", `${y}px`);
        pending = null;
      };

      const onMove = (event: PointerEvent) => {
        const target = (event.target as Element | null)?.closest<HTMLElement>(".mo-spot");
        if (!target) return;
        const box = target.getBoundingClientRect();
        pending = { el: target, x: event.clientX - box.left, y: event.clientY - box.top };
        if (!frame) frame = requestAnimationFrame(flush);
      };

      document.addEventListener("pointermove", onMove, { passive: true });
      cleanups.push(() => {
        document.removeEventListener("pointermove", onMove);
        if (frame) cancelAnimationFrame(frame);
      });
    }

    return () => cleanups.forEach(fn => fn());
  }, []);

  return null;
}
