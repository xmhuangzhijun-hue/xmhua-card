"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, LoaderCircle, Plus, Save, Search, Trash2, TriangleAlert } from "lucide-react";
import { adminApi, describeError } from "./admin-api";
import { Field, type FieldSpec, type FieldValues } from "./fields";

export type CollectionConfig = {
  collection: string;
  singular: string;
  fields: FieldSpec[];
  blank: FieldValues;
  /** Row label in the list. */
  title: (row: FieldValues) => string;
  subtitle?: (row: FieldValues) => string;
  /** Marks rows the owner still has to finish. */
  incomplete?: (row: FieldValues) => string | null;
  reorderable?: boolean;
};

type Row = FieldValues & { id: number };

/** Which slice of the collection the list is showing. */
type ListFilter = "all" | "published" | "draft" | "incomplete";

export function CollectionEditor({ config, onChanged }: { config: CollectionConfig; onChanged?: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<FieldValues>(config.blank);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<ListFilter>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const data = await adminApi.list<Row>(config.collection);
      setRows(data);
      setNotice(null);
    } catch (error) {
      setNotice({ tone: "error", text: describeError(error) });
    } finally {
      setBusy(false);
    }
  }, [config.collection]);

  useEffect(() => {
    setSelectedId(null);
    setDraft(config.blank);
    setFilter("all");
    setQuery("");
    void load();
  }, [config, load]);

  const selectRow = (row: Row) => {
    setSelectedId(row.id);
    setDraft(pickFields(row, config.fields));
    setNotice(null);
  };

  const startNew = () => {
    setSelectedId("new");
    setDraft(config.blank);
    setNotice(null);
  };

  async function save() {
    setBusy(true);
    try {
      if (selectedId === "new") {
        const created = await adminApi.create<Row>(config.collection, draft);
        setSelectedId(created.id);
      } else if (typeof selectedId === "number") {
        await adminApi.update(config.collection, selectedId, draft);
      }
      await load();
      onChanged?.();
      setNotice({ tone: "ok", text: "已保存，公开页面最多一分钟后更新。" });
    } catch (error) {
      setNotice({ tone: "error", text: describeError(error) });
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    if (!window.confirm(`确定删除「${config.title(row)}」？删除后无法恢复。`)) return;
    setBusy(true);
    try {
      await adminApi.remove(config.collection, row.id);
      if (selectedId === row.id) {
        setSelectedId(null);
        setDraft(config.blank);
      }
      await load();
      onChanged?.();
      setNotice({ tone: "ok", text: "已删除。" });
    } catch (error) {
      setNotice({ tone: "error", text: describeError(error) });
    } finally {
      setBusy(false);
    }
  }

  // Positions come from the full list, never from the filtered view, so ordering
  // stays correct no matter what the list is currently showing.
  async function move(row: Row, direction: -1 | 1) {
    const index = rows.findIndex(candidate => candidate.id === row.id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= rows.length) return;
    const ids = rows.map(item => item.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    setBusy(true);
    try {
      setRows(await adminApi.reorder<Row>(config.collection, ids));
      onChanged?.();
    } catch (error) {
      setNotice({ tone: "error", text: describeError(error) });
    } finally {
      setBusy(false);
    }
  }

  const dirtyLabel = selectedId === "new" ? `新建${config.singular}` : config.title(draft);

  const supportsPublished = "published" in config.blank;
  const counts = useMemo(() => ({
    all: rows.length,
    published: rows.filter(row => row.published === true).length,
    draft: rows.filter(row => row.published === false).length,
    incomplete: config.incomplete ? rows.filter(row => config.incomplete!(row)).length : 0,
  }), [config, rows]);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("zh-CN");
    return rows.filter(row => {
      const byStatus =
        filter === "published" ? row.published === true
        : filter === "draft" ? row.published === false
        : filter === "incomplete" ? Boolean(config.incomplete?.(row))
        : true;
      if (!byStatus) return false;
      if (!needle) return true;
      const haystack = `${config.title(row)} ${config.subtitle?.(row) ?? ""}`.toLocaleLowerCase("zh-CN");
      return haystack.includes(needle);
    });
  }, [config, filter, query, rows]);

  // Reordering writes absolute positions, so it is only offered on the unfiltered list.
  const canReorder = Boolean(config.reorderable) && filter === "all" && !query.trim();

  const tabs = [
    { id: "all" as const, label: "全部", count: counts.all, show: true },
    { id: "draft" as const, label: "草稿", count: counts.draft, show: supportsPublished },
    { id: "published" as const, label: "已发布", count: counts.published, show: supportsPublished },
    { id: "incomplete" as const, label: "待完善", count: counts.incomplete, show: counts.incomplete > 0 },
  ].filter(tab => tab.show);

  return (
    <div className="ac-collection">
      <aside className="ac-list">
        <div className="ac-list__head">
          <div>
            <strong>{rows.length} 条</strong>
            {counts.incomplete > 0 && (
              <span className="ac-badge"><TriangleAlert size={12} />{counts.incomplete} 条待完善</span>
            )}
          </div>
          <button type="button" className="ac-button ac-button--primary" onClick={startNew}>
            <Plus size={15} />新建
          </button>
        </div>

        <div className="ac-list__filters" role="tablist" aria-label={`筛选${config.singular}`}>
          {tabs.map(tab => (
            <button
              type="button"
              key={tab.id}
              role="tab"
              aria-selected={filter === tab.id}
              className={filter === tab.id ? "is-active" : ""}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
              <span className={`ac-list__count${tab.id === "draft" && tab.count > 0 ? " ac-list__count--draft" : ""}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <label className="ac-list__search">
          <Search size={14} aria-hidden="true" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={`搜索${config.singular}标题`}
            aria-label={`搜索${config.singular}`}
          />
        </label>
        <ul>
          {visibleRows.map(row => {
            const warning = config.incomplete?.(row) ?? null;
            const position = rows.findIndex(candidate => candidate.id === row.id);
            return (
              <li key={row.id} className={selectedId === row.id ? "is-active" : ""}>
                <button type="button" className="ac-list__row" onClick={() => selectRow(row)}>
                  <span className="ac-list__title">{config.title(row)}</span>
                  {config.subtitle && <span className="ac-list__subtitle">{config.subtitle(row)}</span>}
                  <span className="ac-list__flags">
                    {row.published === false && <span className="ac-chip ac-chip--draft">草稿</span>}
                    {warning && <span className="ac-list__warning"><TriangleAlert size={11} />{warning}</span>}
                  </span>
                </button>
                {canReorder && (
                  <div className="ac-list__order">
                    <button type="button" onClick={() => move(row, -1)} disabled={position === 0} aria-label="上移">
                      <ArrowUp size={13} />
                    </button>
                    <button type="button" onClick={() => move(row, 1)} disabled={position === rows.length - 1} aria-label="下移">
                      <ArrowDown size={13} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
          {rows.length === 0 && !busy && <li className="ac-list__empty">还没有内容，点「新建」开始。</li>}
          {rows.length > 0 && visibleRows.length === 0 && (
            <li className="ac-list__empty">
              这个条件下没有{config.singular}。
              <button type="button" className="ac-list__reset" onClick={() => { setFilter("all"); setQuery(""); }}>
                查看全部
              </button>
            </li>
          )}
          {config.reorderable && !canReorder && visibleRows.length > 0 && (
            <li className="ac-list__hint">筛选或搜索时不能调整顺序，先切回「全部」。</li>
          )}
        </ul>
      </aside>

      <section className="ac-form">
        {selectedId === null ? (
          <div className="ac-form__placeholder">
            <p>从左边选一条{config.singular}来编辑，或者新建一条。</p>
          </div>
        ) : (
          <>
            <header className="ac-form__head">
              <h2>{dirtyLabel || `未命名${config.singular}`}</h2>
              <div className="ac-form__actions">
                {typeof selectedId === "number" && (
                  <button type="button" className="ac-button ac-button--danger"
                    onClick={() => remove(rows.find(row => row.id === selectedId)!)} disabled={busy}>
                    <Trash2 size={15} />删除
                  </button>
                )}
                <button type="button" className="ac-button ac-button--primary" onClick={save} disabled={busy}>
                  {busy ? <LoaderCircle className="ac-spin" size={15} /> : <Save size={15} />}保存
                </button>
              </div>
            </header>
            <div className="ac-form__body">
              {config.fields
                .filter(spec => !spec.visibleWhen || spec.visibleWhen(draft))
                .map(spec => (
                  // Two variants of one field (same name, different kind) can coexist.
                  <Field key={`${spec.name}:${spec.label}`} spec={spec} value={draft[spec.name] ?? ""}
                    suggestions={spec.type === "tags" ? tagSuggestions(rows, spec.name) : undefined}
                    onChange={next => setDraft(current => ({ ...current, [spec.name]: next }))} />
                ))}
            </div>
          </>
        )}
        {notice && (
          <p className={`ac-notice ac-notice--${notice.tone}`} role="status">
            {notice.tone === "ok" ? <Check size={14} /> : <TriangleAlert size={14} />}{notice.text}
          </p>
        )}
      </section>
    </div>
  );
}

function pickFields(row: FieldValues, fields: FieldSpec[]): FieldValues {
  return Object.fromEntries(fields.map(spec => {
    const fallback = spec.type === "boolean" ? false : spec.type === "tags" ? [] : "";
    return [spec.name, row[spec.name] ?? fallback];
  }));
}

/** Every value the collection already uses for a tags field, most common first. */
function tagSuggestions(rows: FieldValues[], name: string): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[name];
    if (!Array.isArray(value)) continue;
    for (const tag of value) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .map(([tag]) => tag);
}
