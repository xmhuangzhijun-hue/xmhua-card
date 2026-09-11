// React Bits StarBorder, specialized to a typed anchor. See LICENSE.md.
import type { AnchorHTMLAttributes } from "react";
import "./StarBorder.css";
export function StarBorder({ children, className = "", ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} className={`star-border-container ${className}`}>
    <span className="border-gradient-bottom" aria-hidden="true" />
    <span className="border-gradient-top" aria-hidden="true" />
    <span className="inner-content">{children}</span>
  </a>;
}
