"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, Plus, Save, TriangleAlert, X } from "lucide-react";
import { adminApi, describeError } from "./admin-api";
import { Field, type FieldSpec } from "./fields";

type Settings = Record<string, unknown>;
type Link = { label: string; href: string };

/** Reads and writes a nested value by dot path, e.g. "hero.primaryAction.label". */
function readPath(source: Settings, path: string): string | boolean {
  const value = path.split(".").reduce<unknown>((node, key) =>
    (node && typeof node === "object" ? (node as Settings)[key] : undefined), source);
  return typeof value === "boolean" ? value : typeof value === "string" ? value : "";
}

function writePath(source: Settings, path: string, value: string | boolean): Settings {
  const [head, ...rest] = path.split(".");
  if (!head) return source;
  if (rest.length === 0) return { ...source, [head]: value };
  const child = (source[head] ?? {}) as Settings;
  return { ...source, [head]: writePath(child, rest.join("."), value) };
}

function readList<T>(source: Settings, path: string): T[] {
  const value = path.split(".").reduce<unknown>((node, key) =>
    (node && typeof node === "object" ? (node as Settings)[key] : undefined), source);
  return Array.isArray(value) ? (value as T[]) : [];
}

const groups: { title: string; help?: string; fields: FieldSpec[] }[] = [
  {
    title: "站点标识",
    fields: [
      { name: "site.brandName", label: "站点名称", type: "text" },
      { name: "site.brandImage", label: "标志图片地址", type: "text", help: "放在 public/ 下的路径，例如 /xmhua-mark.svg" },
      { name: "ui.pageTitle", label: "浏览器标题", type: "text" },
    ],
  },
  {
    title: "顶部公告条",
    help: "留空站点名称下方的公告即可隐藏整条。",
    fields: [
      { name: "site.announcement", label: "公告文字", type: "textarea" },
      { name: "site.announcementLink.label", label: "公告链接文字", type: "text" },
      { name: "site.announcementLink.href", label: "公告链接地址", type: "url" },
      { name: "site.announcementSuffix", label: "公告后缀", type: "text" },
    ],
  },
  {
    title: "首屏",
    fields: [
      { name: "hero.kicker", label: "小标题", type: "text" },
      { name: "hero.title", label: "主标题", type: "text" },
      { name: "hero.description", label: "介绍", type: "textarea", help: "换行会在页面上换行显示。" },
      { name: "hero.primaryAction.label", label: "主按钮文字", type: "text" },
      { name: "hero.primaryAction.href", label: "主按钮地址", type: "url" },
      { name: "hero.secondaryAction.label", label: "次按钮文字", type: "text" },
      { name: "hero.secondaryAction.href", label: "次按钮地址", type: "url" },
    ],
  },
  {
    title: "板块标题",
    fields: [
      { name: "sections.articles.eyebrow", label: "笔记板块 · 小标题", type: "text" },
      { name: "sections.articles.title", label: "笔记板块 · 标题", type: "text" },
      { name: "sections.articles.description", label: "笔记板块 · 说明", type: "textarea" },
      { name: "sections.products.eyebrow", label: "项目板块 · 小标题", type: "text" },
      { name: "sections.products.title", label: "项目板块 · 标题", type: "text" },
      { name: "sections.products.description", label: "项目板块 · 说明", type: "textarea" },
      { name: "sections.directory.eyebrow", label: "能力板块 · 小标题", type: "text" },
      { name: "sections.directory.title", label: "能力板块 · 标题", type: "text" },
      { name: "sections.directory.description", label: "能力板块 · 说明", type: "textarea" },
    ],
  },
  {
    title: "能力地图",
    fields: [
      { name: "directory.kicker", label: "小标题", type: "text" },
      { name: "directory.title", label: "标题", type: "text" },
      { name: "directory.description", label: "说明", type: "textarea" },
      { name: "directory.primaryAction.label", label: "主按钮文字", type: "text" },
      { name: "directory.primaryAction.href", label: "主按钮地址", type: "url" },
      { name: "directory.secondaryAction.label", label: "次按钮文字", type: "text" },
      { name: "directory.secondaryAction.href", label: "次按钮地址", type: "url" },
    ],
  },
  {
    title: "关于我",
    fields: [
      { name: "author.kicker", label: "小标题", type: "text" },
      { name: "author.title", label: "一句话介绍", type: "text" },
    ],
  },
  {
    title: "页脚与联系方式",
    fields: [
      { name: "footer.description", label: "页脚介绍", type: "textarea" },
      { name: "ui.emailLink.label", label: "邮箱按钮文字", type: "text" },
      { name: "ui.emailLink.href", label: "邮箱地址", type: "url", help: "写成 mailto:you@example.com；留空则不显示。" },
      { name: "footer.note", label: "页脚备注", type: "text" },
      { name: "footer.copyright", label: "版权行", type: "text" },
    ],
  },
  {
    title: "访问统计",
    fields: [
      { name: "ui.analytics.enabled", label: "启用统计同意条", type: "boolean", help: "关闭时公开页面不出现任何统计提示。" },
      { name: "ui.analytics.title", label: "同意条标题", type: "text" },
      { name: "ui.analytics.description", label: "同意条说明", type: "textarea" },
    ],
  },
];

export function SettingsEditor({ onChanged }: { onChanged?: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setSettings(await adminApi.settings());
    } catch (error) {
      setNotice({ tone: "error", text: describeError(error) });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!settings) return <div className="ac-form__placeholder"><p>正在读取站点设置……</p></div>;

  const update = (path: string, value: string | boolean) =>
    setSettings(current => (current ? writePath(current, path, value) : current));

  const updateList = (path: string, value: unknown[]) =>
    setSettings(current => (current ? (writePath as unknown as
      (s: Settings, p: string, v: unknown) => Settings)(current, path, value) : current));

  async function save() {
    setBusy(true);
    try {
      await adminApi.saveSettings(settings);
      onChanged?.();
      setNotice({ tone: "ok", text: "站点设置已保存。" });
    } catch (error) {
      setNotice({ tone: "error", text: describeError(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ac-settings">
      <header className="ac-form__head ac-form__head--sticky">
        <h2>站点设置</h2>
        <button type="button" className="ac-button ac-button--primary" onClick={save} disabled={busy}>
          {busy ? <LoaderCircle className="ac-spin" size={15} /> : <Save size={15} />}保存设置
        </button>
      </header>

      <div className="ac-settings__groups">
        <section className="ac-group">
          <h3>导航菜单</h3>
          <p className="ac-group__help">顶部菜单项。地址可以是 /notes 这样的站内路径，或 #products 这样的锚点。</p>
          <LinkListEditor
            items={readList<Link>(settings, "site.navigation")}
            onChange={items => updateList("site.navigation", items)}
          />
        </section>

        <section className="ac-group">
          <h3>页脚法律链接</h3>
          <LinkListEditor
            items={readList<Link>(settings, "footer.legalLinks")}
            onChange={items => updateList("footer.legalLinks", items)}
          />
        </section>

        <section className="ac-group">
          <h3>首屏标签</h3>
          <p className="ac-group__help">首屏下方的关键词，一行一个。</p>
          <TextListEditor
            items={readList<string>(settings, "hero.tags")}
            placeholder="例如：AI 产品"
            onChange={items => updateList("hero.tags", items)}
          />
        </section>

        <section className="ac-group">
          <h3>关于我 · 段落</h3>
          <TextListEditor
            items={readList<string>(settings, "author.paragraphs")}
            placeholder="一段自我介绍"
            multiline
            onChange={items => updateList("author.paragraphs", items)}
          />
        </section>

        {groups.map(group => (
          <section className="ac-group" key={group.title}>
            <h3>{group.title}</h3>
            {group.help && <p className="ac-group__help">{group.help}</p>}
            {group.fields.map(spec => (
              <Field key={spec.name} spec={spec} value={readPath(settings, spec.name)}
                onChange={next => update(spec.name, next)} />
            ))}
          </section>
        ))}
      </div>

      {notice && (
        <p className={`ac-notice ac-notice--${notice.tone}`} role="status">
          {notice.tone === "ok" ? <Check size={14} /> : <TriangleAlert size={14} />}{notice.text}
        </p>
      )}
    </div>
  );
}

function LinkListEditor({ items, onChange }: { items: Link[]; onChange: (items: Link[]) => void }) {
  return (
    <div className="ac-rows">
      {items.map((item, index) => (
        <div className="ac-row" key={index}>
          <input value={item.label} placeholder="显示文字"
            onChange={event => onChange(items.map((row, i) => i === index ? { ...row, label: event.target.value } : row))} />
          <input value={item.href} placeholder="/notes 或 https://…"
            onChange={event => onChange(items.map((row, i) => i === index ? { ...row, href: event.target.value } : row))} />
          <button type="button" className="ac-row__remove" aria-label="删除这一项"
            onClick={() => onChange(items.filter((_, i) => i !== index))}>
            <X size={14} />
          </button>
        </div>
      ))}
      <button type="button" className="ac-button" onClick={() => onChange([...items, { label: "", href: "" }])}>
        <Plus size={14} />添加一项
      </button>
    </div>
  );
}

function TextListEditor({ items, placeholder, multiline = false, onChange }: {
  items: string[];
  placeholder?: string;
  multiline?: boolean;
  onChange: (items: string[]) => void;
}) {
  const replace = (index: number, value: string) => onChange(items.map((row, i) => (i === index ? value : row)));
  return (
    <div className="ac-rows">
      {items.map((item, index) => (
        <div className="ac-row" key={index}>
          {multiline
            ? <textarea rows={3} value={item} placeholder={placeholder} onChange={event => replace(index, event.target.value)} />
            : <input value={item} placeholder={placeholder} onChange={event => replace(index, event.target.value)} />}
          <button type="button" className="ac-row__remove" aria-label="删除这一项"
            onClick={() => onChange(items.filter((_, i) => i !== index))}>
            <X size={14} />
          </button>
        </div>
      ))}
      <button type="button" className="ac-button" onClick={() => onChange([...items, ""])}>
        <Plus size={14} />添加一项
      </button>
    </div>
  );
}
