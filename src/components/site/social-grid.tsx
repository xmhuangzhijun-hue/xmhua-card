"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, QrCode, X } from "lucide-react";
import type { SocialLink } from "@/lib/content-types";

/**
 * Link entries navigate. QR entries open a dialog with the code, because platforms
 * like WeChat have no addressable personal page to link to.
 */
export function SocialGrid({ socials }: { socials: SocialLink[] }) {
  const [active, setActive] = useState<SocialLink | null>(null);

  return (
    <>
      <div className="social-card-grid">
        {socials.map(social => social.kind === "qrcode" ? (
          <button className="social-card" key={social.id} type="button" onClick={() => setActive(social)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="social-card__icon" src={social.icon} alt="" />
            <span>{social.label}</span>
            <strong>{social.handle}</strong>
            <QrCode className="social-card__external" size={14} />
          </button>
        ) : (
          <a className="social-card" href={social.href} key={social.id} target="_blank" rel="noreferrer noopener">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="social-card__icon" src={social.icon} alt="" />
            <span>{social.label}</span>
            <strong>{social.handle}</strong>
            <ExternalLink className="social-card__external" size={14} />
          </a>
        ))}
      </div>
      {active && <QrDialog social={active} onClose={() => setActive(null)} />}
    </>
  );
}

function QrDialog({ social, onClose }: { social: SocialLink; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="qr-backdrop" onClick={onClose} role="presentation">
      <div
        className="qr-dialog"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${social.label} 二维码`}
        onClick={event => event.stopPropagation()}
      >
        <button className="qr-dialog__close" type="button" onClick={onClose} aria-label="关闭">
          <X size={18} />
        </button>
        <p className="qr-dialog__label">{social.label}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="qr-dialog__code" src={social.qrAsset} alt={`${social.label} 二维码`} />
        {social.handle && <CopyRow value={social.handle} />}
        <p className="qr-dialog__hint">
          {social.note || "用手机扫描上方二维码。"}
        </p>
        <p className="qr-dialog__mobile">
          手机上打开这个页面的话：长按二维码保存图片，再到微信「扫一扫」右上角相册里选它。
        </p>
        {social.href && social.href !== "#" && (
          <a className="qr-dialog__link" href={social.href} target="_blank" rel="noreferrer noopener">
            打开主页 <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be denied; the value stays selectable on screen.
    }
  }

  return (
    <div className="qr-dialog__handle">
      <code>{value}</code>
      <button type="button" onClick={copy} aria-label="复制">
        {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "已复制" : "复制"}
      </button>
    </div>
  );
}
