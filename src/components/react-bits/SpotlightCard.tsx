"use client";
// React Bits SpotlightCard, David Haz. See LICENSE.md. Site tokens replace fixed colors.
import { useRef, type PropsWithChildren, type HTMLAttributes } from "react";
import "./SpotlightCard.css";
export function SpotlightCard({ children, className = "", ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const ref = useRef<HTMLDivElement>(null);
  return <div {...props} ref={ref} className={`card-spotlight ${className}`} onPointerMove={event => {
    if (!ref.current || event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
    ref.current.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
  }}>{children}</div>;
}
