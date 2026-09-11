"use client";
import { useEffect, useState } from "react";
import { Check, Copy, Focus, Minus, Plus } from "lucide-react";

export function ReadingTools() {
  const [size, setSize] = useState(18);
  const [focus, setFocus] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--reading-size", `${size}px`);
    root.classList.toggle("reading-focus", focus);
    return () => { root.style.removeProperty("--reading-size"); root.classList.remove("reading-focus"); };
  }, [size, focus]);
  return <div className="reading-tools" aria-label="阅读设置">
    <button type="button" onClick={() => setFocus(!focus)} aria-pressed={focus}><Focus size={15} />{focus ? "退出聚焦" : "聚焦阅读"}</button>
    <div className="reading-size"><button type="button" aria-label="减小字号" disabled={size <= 16} onClick={() => setSize(size - 1)}><Minus size={14} /></button><span aria-live="polite">{size}</span><button type="button" aria-label="增大字号" disabled={size >= 23} onClick={() => setSize(size + 1)}><Plus size={14} /></button></div>
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(location.href); setCopied(true); } catch { setCopied(false); } }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "已复制" : "复制链接"}</button>
  </div>;
}
