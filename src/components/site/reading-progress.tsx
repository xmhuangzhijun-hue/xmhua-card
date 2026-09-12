"use client";

import { useEffect } from "react";

/**
 * A hairline bar showing how far through a note the reader is.
 *
 * Where the browser has `animation-timeline: scroll()` the CSS drives it with no
 * listener at all; this component then renders the bar and does nothing else.
 * Older browsers get a passive, rAF-coalesced scroll listener instead.
 */
export function ReadingProgress() {
  useEffect(() => {
    if (CSS.supports("animation-timeline", "scroll()")) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const travel = doc.scrollHeight - doc.clientHeight;
      const ratio = travel > 0 ? Math.min(1, doc.scrollTop / travel) : 0;
      doc.style.setProperty("--mo-progress", String(ratio));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty("--mo-progress");
    };
  }, []);

  return <div className="mo-progress" aria-hidden="true" />;
}
