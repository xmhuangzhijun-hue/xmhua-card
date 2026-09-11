"use client";
// React Bits AnimatedContent behavior adapted to native IO/WAAPI. See README and LICENSE.
import { useEffect, useRef, type PropsWithChildren } from "react";
export function AnimatedContent({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(el);
      if (reduced.matches || document.documentElement.dataset.motion === "paused") return;
      animation = el.animate([{ opacity: .3, transform: "translateY(24px) scale(.985)" }, { opacity: 1, transform: "none" }], { duration: 650, easing: "cubic-bezier(.16,1,.3,1)" });
    }, { threshold: .08 });
    const stop = () => { if (reduced.matches) animation?.cancel(); };
    observer.observe(el); reduced.addEventListener("change", stop);
    return () => { observer.disconnect(); animation?.cancel(); reduced.removeEventListener("change", stop); };
  }, []);
  return <div ref={ref} className={`animated-content ${className}`}>{children}</div>;
}
