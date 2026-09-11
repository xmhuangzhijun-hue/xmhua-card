"use client";
import { useState } from "react";
export function ProjectDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return <div className="project-description" data-expanded={expanded}>
    <p className="product-card__summary">{text}</p>
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "收起说明 −" : "完整项目说明 +"}</button>
  </div>;
}
