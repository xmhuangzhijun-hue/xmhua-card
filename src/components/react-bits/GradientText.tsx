// React Bits GradientText, adapted to its CSS animation path. See LICENSE.md.
import type { ReactNode } from "react";
import "./GradientText.css";
export function GradientText({ children }: { children: ReactNode }) {
  return <span className="animated-gradient-text"><span className="text-content">{children}</span></span>;
}
