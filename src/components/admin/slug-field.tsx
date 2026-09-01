"use client";

import { useId } from "react";
import { Wand2 } from "lucide-react";

/**
 * The slug decides the note's own address, which is easy to mistake for "the link
 * to the thing I am writing about". So this field shows the resulting URL, cleans
 * up a pasted address instead of rejecting it, and reports the rule inline rather
 * than letting the server refuse the save.
 */
export function SlugField({ value, prefix, onChange }: {
  value: string;
  prefix: string;
  onChange: (next: string) => void;
}) {
  const id = useId();
  const problem = describeProblem(value);

  return (
    <div className="ac-field">
      <label className="ac-field__label" htmlFor={id}>网址后缀</label>
      <small>这篇内容在你自己网站上的地址，不是原文链接。只能用小写英文、数字和连字符。</small>
      <div className="ac-slug">
        <span className="ac-slug__prefix">{prefix}</span>
        <input
          id={id}
          value={value}
          placeholder="skillos-task-feedback"
          onChange={event => onChange(event.target.value)}
          onBlur={event => {
            const cleaned = slugify(event.target.value);
            if (cleaned !== event.target.value) onChange(cleaned);
          }}
        />
      </div>
      {value && !problem && (
        <small className="ac-hint">公开地址：{prefix}{value}</small>
      )}
      {problem && (
        <div className="ac-slug__fix">
          <small className="ac-hint ac-hint--warn">{problem}</small>
          {slugify(value) && (
            <button type="button" className="ac-button" onClick={() => onChange(slugify(value))}>
              <Wand2 size={14} />改成 {slugify(value)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function describeProblem(value: string) {
  if (!value.trim()) return "还没填，保存会失败。";
  if (/^https?:\/\//i.test(value)) return "这里不要填完整网址。原文链接请填下面的「原文链接」。";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return "只能用小写英文、数字和连字符，不能有空格、中文或斜杠。";
  return null;
}

/** Turns a pasted URL or loose text into a usable slug. */
export function slugify(raw: string) {
  let value = raw.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      // The last meaningful path segment is almost always the useful identifier.
      const segments = url.pathname.split("/").filter(Boolean);
      value = segments[segments.length - 1] ?? url.hostname;
    } catch {
      // Fall through and clean the raw string.
    }
  }
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
