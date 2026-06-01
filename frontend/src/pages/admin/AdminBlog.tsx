import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  adminListPosts,
  adminDeletePost,
  adminPatchPost,
  type BlogPost,
} from "../../lib/blog-api";
import styles from "./AdminBlog.module.css";

/* =====================================================================
   AdminBlog — список всіх статей (включно з drafts).
   Дії: створити, редагувати, видалити, перемкнути status,
   переглянути на сайті.
   ===================================================================== */

const formatDate = (iso?: string | null): string => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("uk-UA", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
};

const AdminBlog: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListPosts();
      setItems(data.items);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити статті");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((it) => {
    if (filter !== "all" && it.status !== filter) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      const hay = `${it.title} ${it.excerpt} ${it.category} ${it.tags.join(" ")}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const handleDelete = async (it: BlogPost) => {
    if (!window.confirm(`Видалити статтю «${it.title}»?`)) return;
    setBusy(true);
    try {
      await adminDeletePost(it.id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Помилка видалення");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStatus = async (it: BlogPost) => {
    const next = it.status === "published" ? "draft" : "published";
    setBusy(true);
    try {
      await adminPatchPost(it.id, { status: next });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося оновити статус");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleHot = async (it: BlogPost) => {
    setBusy(true);
    try {
      await adminPatchPost(it.id, { hot: !it.hot });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося оновити");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.shell} data-testid="admin-blog-page">
      <div className={styles.toolbar}>
        <p className={styles.title}>
          Статтей: <strong>{items.length}</strong>
          {items.length > 0 && (
            <span className={styles.muted}>
              {" • "}Опубліковано: {items.filter((i) => i.status === "published").length} • Чернеток: {items.filter((i) => i.status === "draft").length}
            </span>
          )}
        </p>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => navigate("/admin/blog/new")}
          data-testid="admin-blog-new"
        >
          + Нова стаття
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.filtersRow}>
        <div className={styles.tabRow}>
          {(["all", "published", "draft"] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={`${styles.tab} ${filter === k ? styles.tabActive : ""}`}
              onClick={() => setFilter(k)}
            >
              {k === "all" ? "Всі" : k === "published" ? "Опубліковані" : "Чернетки"}
            </button>
          ))}
        </div>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Пошук за назвою, категорією, тегом…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.empty}>Завантаження…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>Немає статей, які підходять під фільтри.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Стаття</th>
              <th>Категорія</th>
              <th>Статус</th>
              <th>Дата</th>
              <th>Читання</th>
              <th>Перегляди</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => (
              <tr key={it.id} data-testid={`admin-blog-row-${it.slug}`}>
                <td>
                  <div className={styles.titleCell}>
                    {it.cover_image && (
                      <img
                        className={styles.thumb}
                        src={it.cover_image}
                        alt=""
                        width={56}
                        height={42}
                      />
                    )}
                    <div>
                      <div className={styles.cellTitle}>
                        {it.hot && <span className={styles.hotBadge}>HOT</span>}
                        {it.title}
                      </div>
                      <div className={styles.cellSlug}>/blog/{it.slug}</div>
                    </div>
                  </div>
                </td>
                <td><span className={styles.catTag}>{it.category}</span></td>
                <td>
                  <button
                    type="button"
                    className={`${styles.statusBadge} ${
                      it.status === "published" ? styles.statusPublished : styles.statusDraft
                    }`}
                    onClick={() => handleToggleStatus(it)}
                    disabled={busy}
                    title={`Клік: ${it.status === "published" ? "зняти з публікації" : "опублікувати"}`}
                  >
                    {it.status === "published" ? "✓ Опубліковано" : "✎ Чернетка"}
                  </button>
                </td>
                <td className={styles.muted}>{formatDate(it.published_at || it.created_at)}</td>
                <td className={styles.muted}>{it.reading_minutes} хв</td>
                <td className={styles.muted}>{it.views || 0}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.actBtn}
                      onClick={() => handleToggleHot(it)}
                      disabled={busy}
                      title={it.hot ? "Зняти HOT" : "Позначити HOT"}
                    >
                      {it.hot ? "⚡" : "☆"}
                    </button>
                    <Link
                      to={`/blog/${it.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.actBtn}
                      title="Переглянути на сайті"
                    >
                      ⇗
                    </Link>
                    <button
                      type="button"
                      className={styles.actBtnPrimary}
                      onClick={() => navigate(`/admin/blog/${it.id}/edit`)}
                      data-testid={`admin-blog-edit-${it.slug}`}
                    >
                      Редагувати
                    </button>
                    <button
                      type="button"
                      className={`${styles.actBtn} ${styles.actBtnDanger}`}
                      onClick={() => handleDelete(it)}
                      disabled={busy}
                      data-testid={`admin-blog-delete-${it.slug}`}
                    >
                      Видалити
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminBlog;
