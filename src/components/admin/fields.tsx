"use client";

import { useId, useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { renderMarkdown } from "@/lib/markdown";

export type FieldSpec = {
  name: string;
  label: string;
  type: "text" | "textarea" | "markdown" | "url" | "date" | "boolean" | "select";
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

export type FieldValues = Record<string, string | boolean>;

export function Field({ spec, value, onChange }: {
  spec: FieldSpec;
  value: string | boolean;
  onChange: (next: string | boolean) => void;
}) {
  const id = useId();

  if (spec.type === "boolean") {
    return (
      <label className="ac-field ac-field--switch" htmlFor={id}>
        <input id={id} type="checkbox" checked={Boolean(value)} onChange={event => onChange(event.target.checked)} />
        <span className="ac-field__label">{spec.label}</span>
        {spec.help && <small>{spec.help}</small>}
      </label>
    );
  }

  return (
    <div className="ac-field">
      <label className="ac-field__label" htmlFor={id}>{spec.label}</label>
      {spec.help && <small>{spec.help}</small>}
      {spec.type === "markdown" ? (
        <MarkdownField id={id} value={String(value ?? "")} placeholder={spec.placeholder} onChange={onChange} />
      ) : spec.type === "textarea" ? (
        <textarea id={id} rows={3} value={String(value ?? "")} placeholder={spec.placeholder}
          onChange={event => onChange(event.target.value)} />
      ) : spec.type === "select" ? (
        <select id={id} value={String(value ?? "")} onChange={event => onChange(event.target.value)}>
          {spec.options?.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <input
          id={id}
          type={spec.type === "date" ? "date" : "text"}
          inputMode={spec.type === "url" ? "url" : undefined}
          value={String(value ?? "")}
          placeholder={spec.placeholder}
          onChange={event => onChange(event.target.value)}
        />
      )}
      {spec.type === "url" && <HrefHint href={String(value ?? "")} />}
    </div>
  );
}

/** Warns before saving, rather than letting a placeholder reach the public site. */
function HrefHint({ href }: { href: string }) {
  const trimmed = href.trim();
  if (!trimmed || trimmed === "#") {
    return <small className="ac-hint ac-hint--warn">还没填地址，这一项不会显示在公开页面上。</small>;
  }
  if (!/^(https?:\/\/|\/|mailto:)/i.test(trimmed)) {
    return <small className="ac-hint ac-hint--warn">地址要以 https://、/ 或 mailto: 开头。</small>;
  }
  return <small className="ac-hint">公开页面会链接到这里。</small>;
}

function MarkdownField({ id, value, placeholder, onChange }: {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (next: string) => void;
}) {
  const [preview, setPreview] = useState(false);
  const characters = value.replace(/\s+/g, "").length;

  return (
    <div className="ac-markdown">
      <div className="ac-markdown__bar">
        <button type="button" className={preview ? "" : "is-active"} onClick={() => setPreview(false)}>
          <Pencil size={13} /> 编辑
        </button>
        <button type="button" className={preview ? "is-active" : ""} onClick={() => setPreview(true)}>
          <Eye size={13} /> 预览
        </button>
        <span>{characters} 字 · 约 {Math.max(1, Math.round(characters / 400))} 分钟</span>
      </div>
      {preview ? (
        <div className="ac-markdown__preview note-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }} />
      ) : (
        <textarea id={id} rows={18} value={value} placeholder={placeholder}
          onChange={event => onChange(event.target.value)} spellCheck={false} />
      )}
      <small className="ac-hint">
        支持 Markdown：## 小标题、**加粗**、- 列表、&gt; 引用、`代码`、[文字](链接)。空一行分段。
      </small>
    </div>
  );
}
