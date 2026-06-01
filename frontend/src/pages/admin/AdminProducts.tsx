import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  adminListProducts,
  adminPatchProduct,
  adminDeleteProduct,
  pickProductCover,
  type Product,
} from "../../lib/products-api";
import styles from "./AdminProducts.module.css";

const formatDate = (iso?: string): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
};

const AdminProducts: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminListProducts();
      setItems(r.items);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити товари");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filter !== "all" && it.status !== filter) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay = `${it.name} ${it.short_desc} ${it.category}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [items, filter, q]);

  const stats = useMemo(() => ({
    total: items.length,
    published: items.filter((it) => it.status === "published").length,
    draft: items.filter((it) => it.status === "draft").length,
  }), [items]);

  const toggleStatus = async (p: Product) => {
    if (busy) return;
    setBusy(true);
    try {
      const nextStatus = p.status === "published" ? "draft" : "published";
      const upd = await adminPatchProduct(p.id, { status: nextStatus });
      setItems((prev) => prev.map((it) => (it.id === p.id ? upd : it)));
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Не вдалося оновити");
    } finally {
      setBusy(false);
    }
  };

  const toggleHit = async (p: Product) => {
    if (busy) return;
    setBusy(true);
    try {
      const upd = await adminPatchProduct(p.id, { is_hit: !p.is_hit });
      setItems((prev) => prev.map((it) => (it.id === p.id ? upd : it)));
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Не вдалося оновити");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Видалити товар «${p.name}»?`)) return;
    setBusy(true);
    try {
      await adminDeleteProduct(p.id);
      setItems((prev) => prev.filter((it) => it.id !== p.id));
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Не вдалося видалити");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <div>
          <h3 className={styles.title}>
            Всього: <b>{stats.total}</b>
            <span className={styles.muted}> · Опубліковано: {stats.published} · Чернетки: {stats.draft}</span>
          </h3>
        </div>
        <div className={styles.toolbarActions}>
          <Link to="/admin/product-categories" className={styles.secondaryBtn}>Категорії фільтру</Link>
          <button className={styles.addBtn} onClick={() => navigate("/admin/products/new")} data-testid="admin-product-new-btn">+ Новий товар</button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.filtersRow}>
        <div className={styles.tabRow}>
          <button className={`${styles.tab} ${filter === "all" ? styles.tabActive : ""}`} onClick={() => setFilter("all")}>Всі</button>
          <button className={`${styles.tab} ${filter === "published" ? styles.tabActive : ""}`} onClick={() => setFilter("published")}>Опубліковані</button>
          <button className={`${styles.tab} ${filter === "draft" ? styles.tabActive : ""}`} onClick={() => setFilter("draft")}>Чернетки</button>
        </div>
        <input
          className={styles.search}
          placeholder="Пошук за назвою, категорією…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="admin-product-search"
        />
      </div>

      {loading ? (
        <div className={styles.loading}>Завантаження…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>Немає товарів за вашим запитом.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Фото</th>
                <th>Назва</th>
                <th>Категорія</th>
                <th>Ціна</th>
                <th>Оновлено</th>
                <th>Статус</th>
                <th>HOT</th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className={styles.thumb}>
                      <img src={pickProductCover(p)} alt={p.name} loading="lazy" width={56} height={56} />
                    </div>
                  </td>
                  <td>
                    <div className={styles.nameCell}>
                      <div className={styles.nameTitle}>{p.name}</div>
                      <div className={styles.nameSlug}>/{p.slug}</div>
                    </div>
                  </td>
                  <td><span className={styles.catBadge}>{p.category}</span></td>
                  <td><b>{p.price} ₴/л</b></td>
                  <td className={styles.muted}>{formatDate(p.updated_at)}</td>
                  <td>
                    <button
                      type="button"
                      className={`${styles.statusBtn} ${p.status === "published" ? styles.statusPub : styles.statusDraft}`}
                      onClick={() => toggleStatus(p)}
                      disabled={busy}
                      title="Клік для зміни статусу"
                    >
                      {p.status === "published" ? "Опубліковано" : "Чернетка"}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`${styles.hotBtn} ${p.is_hit ? styles.hotOn : ""}`}
                      onClick={() => toggleHit(p)}
                      disabled={busy}
                    >
                      {p.is_hit ? "🔥 HIT" : "—"}
                    </button>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link to={`/product/${p.slug}`} target="_blank" rel="noreferrer" className={styles.actionLink}>Перегляд</Link>
                      <Link to={`/admin/products/${p.id}/edit`} className={styles.actionLink}>Редаг.</Link>
                      <button onClick={() => handleDelete(p)} className={styles.actionDelete} disabled={busy}>Вид.</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
