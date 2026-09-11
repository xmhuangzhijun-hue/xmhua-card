// React Bits GlareHover, David Haz. See LICENSE.md. CSS controls site-specific geometry.
import type { PropsWithChildren } from "react";
import "./GlareHover.css";
export function GlareHover({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`glare-hover ${className}`}>{children}</div>;
}
