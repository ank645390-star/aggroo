import React, { useEffect, useState } from "react";
import {
  adminListCategories,
  adminCreateCategory,
  adminPatchCategory,
  adminDeleteCategory,
  adminReorderCategories,
  type ProductCategory,
} from "../../lib/products-api";
import styles from "./AdminProductCategories.module.css";

const slugify = (s: string) => s
  .toLowerCase().trim()
  .replace(/[^a-z0-9\u0400-\u04FF\s-]/g, "")
  .replace(/\s+/g, "-").replace(/-+/g, "-");

const AdminProductCategories: React.FC = () => {
  const [items, setItems] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminListCategories();
      setItems(r.items);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const slug = (newSlug || slugify(newLabel)).trim();
    const label = newLabel.trim();
    if (!slug || !label) { alert("Слаг та назва обов'язкові"); return; }
    setBusy(true);
    try {
      const c = await adminCreateCategory({ slug, label, sort_order: items.length, active: true });
      setItems((prev) => [...prev, c]);
      setNewSlug(""); setNewLabel("");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Помилка");
    } finally {
      setBusy(false);
    }
  };

  const handlePatch = async (id: string, patch: Partial<ProductCategory>) => {
    setBusy(true);
    try {
      const upd = await adminPatchCategory(id, patch as any);
      setItems((prev) => prev.map((c) => c.id === id ? upd : c));
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Помилка оновлення");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (c: ProductCategory) => {
    if (!window.confirm(`Видалити категорію «${c.label}»?`)) return;
    setBusy(true);
    try {
      await adminDeleteCategory(c.id);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Не вдалося видалити");
    } finally {
      setBusy(false);
    }
  };

  const move = async (i: number, dir: -1 | 1) => {
    const ni = i + dir;
    if (ni < 0 || ni >= items.length) return;
    const next = items.slice();
    [next[i], next[ni]] = [next[ni], next[i]];
    setItems(next);
    try {
      await adminReorderCategories(next.map((c) => c.id));
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Не вдалося перевпорядкувати");
      load();
    }
  };

  return (
    <div className={styles.shell}>
      <form className={styles.createCard} onSubmit={handleCreate}>
        <h3 className={styles.cardTitle}>Додати категорію</h3>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Назва для користувача</span>
            <input className={styles.input} value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Наприклад: Біоінсектициди" />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Slug (авто якщо порожнє)</span>
            <input className={styles.input} value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="наприклад: biopesticide" />
          </label>
          <button type="submit" className={styles.addBtn} disabled={busy}>+ Додати</button>
        </div>
      </form>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Завантаження…</div>
      ) : (
        <div className={styles.list}>
          {items.map((c, i) => (
            <div key={c.id} className={styles.itemRow}>
              <div className={styles.itemOrder}>
                <button type="button" className={styles.miniBtn} onClick={() => move(i, -1)} disabled={i === 0 || busy} title="Вище">↑</button>
                <span className={styles.orderNum}>{i + 1}</span>
                <button type="button" className={styles.miniBtn} onClick={() => move(i, +1)} disabled={i === items.length - 1 || busy} title="Нижче">↓</button>
              </div>
              <input
                className={styles.input}
                defaultValue={c.label}
                onBlur={(e) => { if (e.target.value !== c.label) handlePatch(c.id, { label: e.target.value }); }}
              />
              <input
                className={`${styles.input} ${styles.slugInput}`}
                defaultValue={c.slug}
                onBlur={(e) => { if (e.target.value !== c.slug) handlePatch(c.id, { slug: e.target.value }); }}
              />
              <div className={styles.count}>{c.count ?? 0} тов.</div>
              <label className={styles.activeToggle}>
                <input
                  type="checkbox"
                  checked={c.active}
                  onChange={(e) => handlePatch(c.id, { active: e.target.checked })}
                  disabled={busy}
                />
                <span>Активна</span>
              </label>
              <button type="button" className={styles.deleteBtn} onClick={() => handleDelete(c)} disabled={busy}>Видалити</button>
            </div>
          ))}
          {items.length === 0 && <div className={styles.empty}>Немає категорій. Додайте першу вище.</div>}
        </div>
      )}
    </div>
  );
};

export default AdminProductCategories;
