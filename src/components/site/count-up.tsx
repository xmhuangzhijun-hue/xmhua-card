"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts to `value` once, when the number first scrolls into view.
 *
 * The final value is what server-renders, so the correct number is in the HTML
 * for crawlers and for anyone without JavaScript; the animation only replaces it
 * after mount. Under reduced motion nothing animates at all.
 */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (done.current) return;

    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || done.current) return;
      done.current = true;
      observer.disconnect();

      const start = performance.now();
      let frame = requestAnimationFrame(function step(now) {
        const progress = Math.min(1, (now - start) / duration);
        // Ease-out cubic: fast first, settles gently on the real number.
        const eased = 1 - Math.pow(1 - progress, 3);
        setShown(Math.round(value * eased));
        if (progress < 1) frame = requestAnimationFrame(step);
      });
      return () => cancelAnimationFrame(frame);
    }, { threshold: 0.6 });

    setShown(0);
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span className="mo-count" ref={ref}>{shown}</span>;
}
