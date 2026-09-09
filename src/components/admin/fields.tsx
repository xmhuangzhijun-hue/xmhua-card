"use client";

import { useId, useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { renderMarkdown } from "@/lib/markdown";
import { ImageField } from "./image-field";
import { SlugField } from "./slug-field";

export type FieldSpec = {
  name: string;
  label: string;
  type: "text" | "textarea" | "markdown" | "url" | "date" | "boolean" | "select" | "image" | "slug" | "tags";
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** For "slug": the public URL prefix shown in front of the value. */
  prefix?: string;
  /** Hides the field unless the current draft matches, e.g. only for one kind. */
  visibleWhen?: (draft: FieldValues) => boolean;
};

export type FieldValue = string | boolean | string[];

export type FieldValues = Record<string, FieldValue>;

export function Field({ spec, value, onChange, suggestions }: {
  spec: FieldSpec;
  value: FieldValue;
  onChange: (next: FieldValue) => void;
  /** Existing values across the collection, offered so tags stay consistent. */
  suggestions?: string[];
}) {
  const id = useId();

  if (spec.type === "tags") {
    return <TagsField label={spec.label} help={spec.help} placeholder={spec.placeholder}
      value={Array.isArray(value) ? value : []} suggestions={suggestions ?? []}
      onChange={next => onChange(next)} />;
  }

  if (spec.type === "slug") {
    return <SlugField value={String(value ?? "")} prefix={spec.prefix ?? "/"} onChange={next => onChange(next)} />;
  }

  if (spec.type === "image") {
    return <ImageField label={spec.label} help={spec.help} value={String(value ?? "")}
      onChange={next => onChange(next)} />;
  }

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

/**
 * Chips editor for a string[] field. Enter, comma or a blur commits the buffer;
 * suggestions come from what the rest of the collection already uses, which is
 * what keeps "Agent" and "agent " from becoming two different tags.
 */
function TagsField({ label, help, placeholder, value, suggestions, onChange }: {
  label: string;
  help?: string;
  placeholder?: string;
  value: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [buffer, setBuffer] = useState("");

  const commit = (raw: string) => {
    const parts = raw.split(/[,，]/).map(part => part.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    for (const part of parts) if (!next.includes(part)) next.push(part);
    onChange(next);
    setBuffer("");
  };

  const unused = suggestions.filter(tag => !value.includes(tag));

  return (
    <div className="ac-field">
      <label className="ac-field__label" htmlFor={id}>{label}</label>
      {help && <small>{help}</small>}
      <div className="ac-tags">
        {value.map(tag => (
          <span className="ac-tags__chip" key={tag}>
            {tag}
            <button type="button" aria-label={`移除标签 ${tag}`}
              onClick={() => onChange(value.filter(item => item !== tag))}>×</button>
          </span>
        ))}
        <input
          id={id}
          list={listId}
          className="ac-tags__input"
          value={buffer}
          placeholder={value.length === 0 ? (placeholder ?? "输入后回车") : ""}
          onChange={event => {
            // Picking from the datalist fires change with the whole value at once.
            const next = event.target.value;
            if (suggestions.includes(next)) commit(next); else setBuffer(next);
          }}
          onKeyDown={event => {
            if (event.key === "Enter" || event.key === ",") { event.preventDefault(); commit(buffer); }
            if (event.key === "Backspace" && buffer === "" && value.length > 0) onChange(value.slice(0, -1));
          }}
          onBlur={() => commit(buffer)}
        />
        <datalist id={listId}>
          {unused.map(tag => <option value={tag} key={tag} />)}
        </datalist>
      </div>
    </div>
  );
}
