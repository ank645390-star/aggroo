import React, { useEffect, useState } from "react";
import {
  listInsideTabsAdmin,
  createInsideTab,
  patchInsideTab,
  deleteInsideTab,
  reorderInsideTabs,
  getInsideMetaAdmin,
  updateInsideMeta,
  type InsideTab,
  type InsideMeta,
} from "../../lib/inside-api";
import styles from "./AdminInsideTabs.module.css";

/* =====================================================================
   Admin Inside Tabs — секція «Зазирни всередину» на /cultures.
   Повне керування пунктами + заголовком секції.
   ===================================================================== */

type Draft = {
  label: string;
  slug: string;
  title: string;
  description: string;
  image_url: string;
  image_alt: string;
  accent_color: string;
  is_active: boolean;
};

const emptyDraft: Draft = {
  label: "",
  slug: "",
  title: "",
  description: "",
  image_url: "",
  image_alt: "",
  accent_color: "",
  is_active: true,
};

const toDraft = (t: InsideTab): Draft => ({
  label: t.label,
  slug: t.slug,
  title: t.title,
  description: t.description,
  image_url: t.image_url || "",
  image_alt: t.image_alt || "",
  accent_color: t.accent_color || "",
  is_active: t.is_active,
});

const AdminInsideTabs: React.FC = () => {
  const [items, setItems] = useState<InsideTab[]>([]);
  const [meta, setMeta] = useState<InsideMeta>({ title1: "", title2: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, m] = await Promise.all([
        listInsideTabsAdmin(),
        getInsideMetaAdmin(),
      ]);
      setItems(list);
      setMeta(m);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити дані");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleSaveMeta = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateInsideMeta({
        title1: meta.title1.trim(),
        title2: meta.title2.trim(),
      });
      setMeta(updated);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося зберегти заголовок");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!draft.label.trim()) { setError("Назва кнопки обов'язкова"); return; }
    setBusy(true); setError(null);
    try {
      await createInsideTab({
        label: draft.label.trim(),
        slug: draft.slug.trim() || undefined,
        title: draft.title,
        description: draft.description,
        image_url: draft.image_url.trim(),
        image_alt: draft.image_alt.trim(),
        accent_color: draft.accent_color.trim(),
        is_active: draft.is_active,
      });
      setDraft(emptyDraft);
      setCreating(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося створити пункт");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editDraft.label.trim()) { setError("Назва кнопки обов'язкова"); return; }
    setBusy(true); setError(null);
    try {
      await patchInsideTab(editingId, {
        label: editDraft.label.trim(),
        slug: editDraft.slug.trim() || undefined,
        title: editDraft.title,
        description: editDraft.description,
        image_url: editDraft.image_url.trim(),
        image_alt: editDraft.image_alt.trim(),
        accent_color: editDraft.accent_color.trim(),
        is_active: editDraft.is_active,
      });
      setEditingId(null);
      setEditDraft(emptyDraft);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося зберегти зміни");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Видалити пункт «${label}»?`)) return;
    setBusy(true); setError(null);
    try {
      await deleteInsideTab(id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося видалити");
    } finally {
      setBusy(false);
    }
  };

  const moveItem = async (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= items.length) return;
    const reordered = [...items];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, moved);
    setItems(reordered);
    setBusy(true);
    try {
      const updated = await reorderInsideTabs(reordered.map((x) => x.id));
      setItems(updated);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося оновити порядок");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page} data-testid="admin-inside-tabs">
      {error && <div className={styles.error}>{error}</div>}

      {/* ===== Section meta (heading) ===== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Заголовок секції</h2>
        <div className={styles.metaRow}>
          <div className={styles.field}>
            <label className={styles.label}>Перше слово (велике)</label>
            <input
              className={styles.input}
              value={meta.title1}
              onChange={(e) => setMeta({ ...meta, title1: e.target.value })}
              placeholder="Зазирни"
              data-testid="meta-title1"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Друге слово (нижче, того ж стилю)</label>
            <input
              className={styles.input}
              value={meta.title2}
              onChange={(e) => setMeta({ ...meta, title2: e.target.value })}
              placeholder="всередину"
              data-testid="meta-title2"
            />
          </div>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSaveMeta}
            disabled={busy}
            data-testid="meta-save"
          >
            Зберегти заголовок
          </button>
        </div>
      </div>

      {/* ===== Tab items ===== */}
      <div className={styles.section}>
        <div className={styles.headRow}>
          <h2 className={styles.sectionTitle}>Пункти ({items.length})</h2>
          {!creating && (
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => { setCreating(true); setDraft(emptyDraft); }}
              data-testid="add-tab"
            >
              + Додати пункт
            </button>
          )}
        </div>

        {creating && (
          <div className={`${styles.card} ${styles.cardEditing}`}>
            <div />
            <div className={styles.createGrid} style={{ gridColumn: "2 / -1" }}>
              <div className={styles.field}>
                <label className={styles.label}>Назва кнопки *</label>
                <input className={styles.input} value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  data-testid="create-label" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Slug (опційно, auto)</label>
                <input className={styles.input} value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
              </div>
              <div className={`${styles.field} ${styles.full}`}>
                <label className={styles.label}>Заголовок (h3)</label>
                <input className={styles.input} value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div className={`${styles.field} ${styles.full}`}>
                <label className={styles.label}>Опис</label>
                <textarea className={styles.textarea} value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                <span className={styles.hint}>Використовуйте \n або порожній рядок для нового абзацу.</span>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>URL картинки</label>
                <input className={styles.input} value={draft.image_url}
                  onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
                  placeholder="/inside-bacillus.webp" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Alt-текст</label>
                <input className={styles.input} value={draft.image_alt}
                  onChange={(e) => setDraft({ ...draft, image_alt: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Акцент-колір активної кнопки (HEX, опц.)</label>
                <input className={styles.input} value={draft.accent_color}
                  onChange={(e) => setDraft({ ...draft, accent_color: e.target.value })}
                  placeholder="#1B4332" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Активний</label>
                <label className={styles.toggle}>
                  <input type="checkbox" checked={draft.is_active}
                    onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
                  Видимий на сайті
                </label>
              </div>
              <div className={styles.createActions}>
                <button className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => { setCreating(false); setDraft(emptyDraft); }}>Скасувати</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleCreate} disabled={busy}
                  data-testid="create-save">Створити</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className={styles.loading}>Завантаження…</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>Пунктів ще немає. Додайте перший.</div>
        ) : (
          items.map((it, idx) => {
            const isEditing = editingId === it.id;
            return (
              <div key={it.id} className={`${styles.card} ${isEditing ? styles.cardEditing : ""}`}>
                <div className={styles.orderBtns}>
                  <button onClick={() => moveItem(idx, -1)} disabled={busy || idx === 0} title="Вище">↑</button>
                  <button onClick={() => moveItem(idx, 1)} disabled={busy || idx === items.length - 1} title="Нижче">↓</button>
                </div>

                {!isEditing ? (
                  <>
                    <div className={styles.cardMeta}>
                      <div className={styles.cardLabel}>{it.label}</div>
                      <div className={styles.cardSlug}>{it.slug}</div>
                      <div className={styles.cardStatus}>
                        <span className={`${styles.statusDot} ${!it.is_active ? styles.statusDotOff : ""}`} />
                        {it.is_active ? "Активний" : "Прихований"}
                        {it.accent_color && (
                          <>
                            <span style={{ marginLeft: 12 }} />
                            <span className={styles.colorSwatch} style={{ background: it.accent_color }} />
                            <span style={{ fontFamily: "monospace" }}>{it.accent_color}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={styles.cardDesc}>
                      {it.title ? <strong>{it.title}</strong> : null}
                      {it.title && it.description ? <br /> : null}
                      {it.description}
                    </div>
                    <div className={styles.cardActions}>
                      <button className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => { setEditingId(it.id); setEditDraft(toDraft(it)); }}>
                        Редагувати
                      </button>
                      <button className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={() => handleDelete(it.id, it.label)} disabled={busy}>
                        Видалити
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={styles.editForm}>
                    <div className={styles.field}>
                      <label className={styles.label}>Назва кнопки *</label>
                      <input className={styles.input} value={editDraft.label}
                        onChange={(e) => setEditDraft({ ...editDraft, label: e.target.value })} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Slug</label>
                      <input className={styles.input} value={editDraft.slug}
                        onChange={(e) => setEditDraft({ ...editDraft, slug: e.target.value })} />
                    </div>
                    <div className={`${styles.field} ${styles.full}`}>
                      <label className={styles.label}>Заголовок (h3)</label>
                      <input className={styles.input} value={editDraft.title}
                        onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} />
                    </div>
                    <div className={`${styles.field} ${styles.full}`}>
                      <label className={styles.label}>Опис</label>
                      <textarea className={styles.textarea} value={editDraft.description}
                        onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>URL картинки</label>
                      <input className={styles.input} value={editDraft.image_url}
                        onChange={(e) => setEditDraft({ ...editDraft, image_url: e.target.value })} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Alt-текст</label>
                      <input className={styles.input} value={editDraft.image_alt}
                        onChange={(e) => setEditDraft({ ...editDraft, image_alt: e.target.value })} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Акцент-колір (HEX)</label>
                      <input className={styles.input} value={editDraft.accent_color}
                        onChange={(e) => setEditDraft({ ...editDraft, accent_color: e.target.value })} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Активний</label>
                      <label className={styles.toggle}>
                        <input type="checkbox" checked={editDraft.is_active}
                          onChange={(e) => setEditDraft({ ...editDraft, is_active: e.target.checked })} />
                        Видимий на сайті
                      </label>
                    </div>
                    <div className={styles.editActions}>
                      <button className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => { setEditingId(null); setEditDraft(emptyDraft); }}>
                        Скасувати
                      </button>
                      <button className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={handleSaveEdit} disabled={busy}>
                        Зберегти
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminInsideTabs;
