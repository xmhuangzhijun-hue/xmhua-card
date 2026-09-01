"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, LoaderCircle, Plus, Save, Trash2, TriangleAlert } from "lucide-react";
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

export function CollectionEditor({ config, onChanged }: { config: CollectionConfig; onChanged?: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<FieldValues>(config.blank);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

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

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const ids = rows.map(row => row.id);
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
  const incompleteCount = useMemo(
    () => (config.incomplete ? rows.filter(row => config.incomplete!(row)).length : 0),
    [config, rows],
  );

  return (
    <div className="ac-collection">
      <aside className="ac-list">
        <div className="ac-list__head">
          <div>
            <strong>{rows.length} 条</strong>
            {incompleteCount > 0 && <span className="ac-badge"><TriangleAlert size={12} />{incompleteCount} 条待完善</span>}
          </div>
          <button type="button" className="ac-button ac-button--primary" onClick={startNew}>
            <Plus size={15} />新建
          </button>
        </div>
        <ul>
          {rows.map((row, index) => {
            const warning = config.incomplete?.(row) ?? null;
            return (
              <li key={row.id} className={selectedId === row.id ? "is-active" : ""}>
                <button type="button" className="ac-list__row" onClick={() => selectRow(row)}>
                  <span className="ac-list__title">{config.title(row)}</span>
                  {config.subtitle && <span className="ac-list__subtitle">{config.subtitle(row)}</span>}
                  {warning && <span className="ac-list__warning"><TriangleAlert size={11} />{warning}</span>}
                </button>
                {config.reorderable && (
                  <div className="ac-list__order">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="上移">
                      <ArrowUp size={13} />
                    </button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label="下移">
                      <ArrowDown size={13} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
          {rows.length === 0 && !busy && <li className="ac-list__empty">还没有内容，点「新建」开始。</li>}
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
  return Object.fromEntries(fields.map(spec => [spec.name, row[spec.name] ?? (spec.type === "boolean" ? false : "")]));
}
