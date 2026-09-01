"use client";

import { useRef, useState } from "react";
import { ImageUp, LoaderCircle, Trash2 } from "lucide-react";
import { apiUrl } from "@/lib/api-client";
import { describeError } from "./admin-api";

/**
 * Uploads an image and stores the returned public path in the field value.
 * The server decides the filename from the file's own bytes, so nothing the
 * browser sends becomes part of the stored path.
 */
export function ImageField({ value, label, help, onChange }: {
  value: string;
  label: string;
  help?: string;
  onChange: (next: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(apiUrl("/api/admin/uploads"), {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error === "UNSUPPORTED_IMAGE_TYPE"
          ? "只支持 PNG、JPG、WebP 图片（不支持 SVG）。"
          : payload.error === "FILE_TOO_LARGE" ? "图片超过 2MB，压缩一下再传。"
          : describeError(payload.error));
        return;
      }
      onChange(payload.data.path);
    } catch (uploadError) {
      setError(describeError(uploadError));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="ac-field">
      <span className="ac-field__label">{label}</span>
      {help && <small>{help}</small>}
      <div className="ac-image">
        {value
          // eslint-disable-next-line @next/next/no-img-element
          ? <img className="ac-image__preview" src={value} alt="已上传的图片预览" />
          : <div className="ac-image__empty">还没有图片</div>}
        <div className="ac-image__actions">
          <button type="button" className="ac-button" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? <LoaderCircle className="ac-spin" size={15} /> : <ImageUp size={15} />}
            {value ? "换一张" : "上传图片"}
          </button>
          {value && (
            <button type="button" className="ac-button ac-button--danger" onClick={() => onChange("")} disabled={busy}>
              <Trash2 size={15} />移除
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </div>
      </div>
      {error && <small className="ac-hint ac-hint--warn">{error}</small>}
      {!value && !error && <small className="ac-hint ac-hint--warn">没有图片，这一项不会显示在公开页面上。</small>}
    </div>
  );
}
