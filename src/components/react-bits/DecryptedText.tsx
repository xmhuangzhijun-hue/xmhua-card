"use client";
// React Bits DecryptedText sequential reveal adapted without Motion. See LICENSE.md.
import { useCallback, useEffect, useRef, useState } from "react";
export function DecryptedText({ text }: { text: string }) {
  const [display, setDisplay] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const start = useCallback(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "paused") return;
    clearInterval(timer.current);
    let step = 0;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    timer.current = setInterval(() => {
      step++;
      setDisplay([...text].map((char, index) => char === " " || index < step * 3 ? char : chars[Math.floor(Math.random() * chars.length)]).join(""));
      if (step * 3 >= text.length) clearInterval(timer.current);
    }, 40);
  }, [text]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { start(); observer.disconnect(); } });
    if (ref.current) observer.observe(ref.current);
    return () => { observer.disconnect(); clearInterval(timer.current); };
  }, [start]);
  return <span ref={ref} onMouseEnter={start} className="decrypted-text"><span className="sr-only">{text}</span><span aria-hidden="true">{display}</span></span>;
}
