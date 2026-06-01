import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listReviews,
  createReview,
  patchReview,
  deleteReview,
  reorderReviews,
  uploadReviewImage,
  type ReviewItem,
} from "../../lib/reviews-api";
import { listProducts, type Product } from "../../lib/products-api";
import BrandSelect from "../../components/admin/BrandSelect";
import styles from "./AdminReviews.module.css";

/* =====================================================================
   Admin Reviews — повний CRUD над відгуками клієнтів.
   Поля: автор, посада/господарство, фото, категорія, текст, рейтинг,
   дата (display + ISO), прив'язка до товару, прапорці published/highlighted.
   ===================================================================== */

const STAR_SIZE = 18;

const Star: React.FC<{ filled: boolean; onClick?: () => void; size?: number }> = ({
  filled,
  onClick,
  size = STAR_SIZE,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={styles.starBtn}
    aria-label={filled ? "Заповнена" : "Порожня"}
    tabIndex={onClick ? 0 : -1}
  >
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#ACB14F" : "none"} stroke="#ACB14F" strokeWidth="1.6">
      <path d="M12 2.5l2.94 6.57 7.06.75-5.32 4.86 1.55 7.07L12 17.94l-6.23 3.81 1.55-7.07L2 9.82l7.06-.75L12 2.5z" />
    </svg>
  </button>
);

type DraftReview = {
  id?: string;
  author_name: string;
  author_role: string;
  author_photo: string;
  category: string;
  body: string;
  rating: number;
  display_date: string;
  date_iso: string;
  product_id: string;        // empty string == no product
  published: boolean;
  highlighted: boolean;
};

const emptyDraft = (): DraftReview => ({
  author_name: "",
  author_role: "",
  author_photo: "",
  category: "",
  body: "",
  rating: 5,
  display_date: "",
  date_iso: "",
  product_id: "",
  published: true,
  highlighted: true,
});

const AdminReviews: React.FC = () => {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Editor state — used both for "create new" (id missing) and "edit existing"
  const [draft, setDraft] = useState<DraftReview | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filters
  const [filterText, setFilterText] = useState("");
  const [filterProduct, setFilterProduct] = useState<string>("");
  const [filterHighlighted, setFilterHighlighted] =
    useState<"all" | "yes" | "no">("all");
  const [filterPublished, setFilterPublished] =
    useState<"all" | "yes" | "no">("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [revs, prods] = await Promise.all([
        listReviews(),
        listProducts({ limit: 100 }).then((r) => r.items || []).catch(() => []),
      ]);
      setItems(revs);
      setProducts(prods);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити відгуки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const flashError = (e: any, fallback: string) => {
    setError(e?.response?.data?.detail || fallback);
    setTimeout(() => setError(null), 4000);
  };

  /* ---------- Editor handlers ---------- */

  const openCreate = () => {
    setDraft(emptyDraft());
  };

  const openEdit = (it: ReviewItem) => {
    setDraft({
      id: it.id,
      author_name: it.author_name || "",
      author_role: it.author_role || "",
      author_photo: it.author_photo || "",
      category: it.category || "",
      body: it.body || "",
      rating: it.rating || 5,
      display_date: it.display_date || "",
      date_iso: it.date_iso || "",
      product_id: it.product_id || "",
      published: !!it.published,
      highlighted: !!it.highlighted,
    });
  };

  const closeEditor = () => setDraft(null);

  const updateDraft = <K extends keyof DraftReview>(k: K, v: DraftReview[K]) => {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  };

  const onUploadPhoto = async (file: File) => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const r = await uploadReviewImage(file);
      updateDraft("author_photo", r.url);
      setNotice("Фото завантажено");
    } catch (e: any) {
      flashError(e, "Не вдалося завантажити фото");
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!draft) return;
    if (!draft.body.trim()) {
      setError("Текст відгуку обов'язковий");
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      author_name: draft.author_name.trim(),
      author_role: draft.author_role.trim(),
      author_photo: draft.author_photo.trim(),
      category: draft.category.trim(),
      body: draft.body.trim(),
      rating: draft.rating,
      display_date: draft.display_date.trim(),
      date_iso: draft.date_iso.trim() || null,
      product_id: draft.product_id || null,
      published: draft.published,
      highlighted: draft.highlighted,
    };
    try {
      if (draft.id) {
        await patchReview(draft.id, payload as any);
        setNotice("Відгук оновлено");
      } else {
        await createReview(payload as any);
        setNotice("Відгук створено");
      }
      closeEditor();
      await load();
    } catch (e: any) {
      flashError(e, "Помилка збереження");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Видалити цей відгук? Дію не можна скасувати.")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteReview(id);
      setNotice("Відгук видалено");
      await load();
    } catch (e: any) {
      flashError(e, "Помилка видалення");
    } finally {
      setBusy(false);
    }
  };

  const quickToggle = async (it: ReviewItem, field: "published" | "highlighted") => {
    setBusy(true);
    setError(null);
    try {
      await patchReview(it.id, { [field]: !it[field] } as any);
      await load();
    } catch (e: any) {
      flashError(e, "Помилка оновлення");
    } finally {
      setBusy(false);
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const ids = items.map((i) => i.id);
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    setBusy(true);
    try {
      await reorderReviews(ids);
      await load();
    } catch (e: any) {
      flashError(e, "Не вдалося оновити порядок");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Derived: filtered list ---------- */
  const filtered = useMemo(() => {
    const ft = filterText.trim().toLowerCase();
    return items.filter((r) => {
      if (filterProduct && r.product_id !== filterProduct) return false;
      if (filterHighlighted !== "all") {
        if (filterHighlighted === "yes" && !r.highlighted) return false;
        if (filterHighlighted === "no" && r.highlighted) return false;
      }
      if (filterPublished !== "all") {
        if (filterPublished === "yes" && !r.published) return false;
        if (filterPublished === "no" && r.published) return false;
      }
      if (ft) {
        const hay = `${r.author_name} ${r.author_role} ${r.category} ${r.body}`.toLowerCase();
        if (!hay.includes(ft)) return false;
      }
      return true;
    });
  }, [items, filterText, filterProduct, filterHighlighted, filterPublished]);

  /* ---------- Render ---------- */

  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <p className={styles.title}>
          Усього: <b>{items.length}</b> · Опубліковано:{" "}
          <b>{items.filter((i) => i.published).length}</b> · На головній:{" "}
          <b>{items.filter((i) => i.highlighted && i.published).length}</b>
        </p>
        <button
          type="button"
          className={styles.addBtn}
          onClick={openCreate}
          data-testid="admin-reviews-create"
        >
          + Додати відгук
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          className={styles.filterInput}
          placeholder="Пошук за автором/категорією/текстом…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <BrandSelect
          triggerClassName={styles.filterSelect}
          value={filterProduct}
          onChange={(v) => setFilterProduct(v)}
          options={[
            { value: "", label: "Усі товари" },
            ...products.map((p) => ({ value: p.id, label: p.name })),
          ]}
          data-testid="reviews-filter-product"
          minWidth={200}
        />
        <BrandSelect
          triggerClassName={styles.filterSelect}
          value={filterHighlighted}
          onChange={(v) => setFilterHighlighted(v as any)}
          options={[
            { value: "all", label: "Виділені: всі" },
            { value: "yes", label: "На головній" },
            { value: "no", label: "Не на головній" },
          ]}
          data-testid="reviews-filter-highlighted"
          minWidth={180}
        />
        <BrandSelect
          triggerClassName={styles.filterSelect}
          value={filterPublished}
          onChange={(v) => setFilterPublished(v as any)}
          options={[
            { value: "all", label: "Статус: всі" },
            { value: "yes", label: "Опубліковані" },
            { value: "no", label: "Чернетки" },
          ]}
          data-testid="reviews-filter-published"
          minWidth={180}
        />
      </div>

      {error && <div className={styles.alertErr}>{error}</div>}
      {notice && <div className={styles.alertOk}>{notice}</div>}

      {loading ? (
        <div className={styles.empty}>Завантаження…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>Відгуків не знайдено</div>
      ) : (
        <div className={styles.list}>
          {filtered.map((it, idx) => {
            const realIdx = items.findIndex((x) => x.id === it.id);
            return (
              <div key={it.id} className={styles.item} data-testid="admin-reviews-row">
                <div className={styles.itemHead}>
                  <div className={styles.itemMeta}>
                    <span className={styles.itemOrder}>#{it.order + 1}</span>
                    {!it.published && (
                      <span className={styles.badgeDraft}>Чернетка</span>
                    )}
                    {it.highlighted && it.published && (
                      <span className={styles.badgeHighlight}>На головній</span>
                    )}
                    {it.product_name && (
                      <span className={styles.badgeProduct}>📦 {it.product_name}</span>
                    )}
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.actBtn}
                      title="Вище"
                      onClick={() => move(realIdx, -1)}
                      disabled={realIdx === 0 || busy}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.actBtn}
                      title="Нижче"
                      onClick={() => move(realIdx, 1)}
                      disabled={realIdx === items.length - 1 || busy}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={styles.actBtn}
                      onClick={() => quickToggle(it, "published")}
                      title="Опублікувати / Зняти з публікації"
                    >
                      {it.published ? "Сховати" : "Публікувати"}
                    </button>
                    <button
                      type="button"
                      className={styles.actBtn}
                      onClick={() => quickToggle(it, "highlighted")}
                      title="Показати на головній сторінці"
                    >
                      {it.highlighted ? "− з головної" : "+ на головну"}
                    </button>
                    <button
                      type="button"
                      className={`${styles.actBtn} ${styles.actBtnPrimary}`}
                      onClick={() => openEdit(it)}
                    >
                      Редагувати
                    </button>
                    <button
                      type="button"
                      className={`${styles.actBtn} ${styles.actBtnDanger}`}
                      onClick={() => onDelete(it.id)}
                    >
                      Видалити
                    </button>
                  </div>
                </div>

                <div className={styles.itemBody}>
                  {it.author_photo ? (
                    <img
                      loading="lazy"
                      src={it.author_photo}
                      alt={it.author_name}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {(it.author_name || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className={styles.itemContent}>
                    <div className={styles.itemAuthorRow}>
                      <strong className={styles.itemAuthorName}>
                        {it.author_name || "—"}
                      </strong>
                      <span className={styles.itemAuthorRole}>
                        {it.author_role}
                      </span>
                    </div>
                    <div className={styles.itemMetaRow}>
                      {it.category && (
                        <span className={styles.tag}>{it.category}</span>
                      )}
                      <span className={styles.rating}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} filled={i < it.rating} size={14} />
                        ))}
                      </span>
                      {it.display_date && (
                        <span className={styles.date}>{it.display_date}</span>
                      )}
                    </div>
                    <p className={styles.itemText}>{it.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- Editor modal ---------- */}
      {draft && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditor();
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <h2 className={styles.modalTitle}>
                {draft.id ? "Редагування відгуку" : "Новий відгук"}
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={closeEditor}
                aria-label="Закрити"
              >
                ×
              </button>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ім'я автора</span>
                <input
                  className={styles.input}
                  value={draft.author_name}
                  onChange={(e) => updateDraft("author_name", e.target.value)}
                  placeholder="Олександр Кравченко"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Посада / Господарство</span>
                <input
                  className={styles.input}
                  value={draft.author_role}
                  onChange={(e) => updateDraft("author_role", e.target.value)}
                  placeholder="Аграрна компанія м.Львів"
                />
              </label>

              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.fieldLabel}>Фото / Аватар</span>
                <div className={styles.photoRow}>
                  {draft.author_photo ? (
                    <img
                      src={draft.author_photo}
                      alt=""
                      className={styles.photoPreview}
                    />
                  ) : (
                    <div className={styles.photoEmpty}>Без фото</div>
                  )}
                  <div className={styles.photoControls}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="https://… або /image.webp"
                      value={draft.author_photo}
                      onChange={(e) =>
                        updateDraft("author_photo", e.target.value)
                      }
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadPhoto(f);
                        if (e.target) e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className={styles.uploadBtn}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy}
                    >
                      Завантажити файл
                    </button>
                    {draft.author_photo && (
                      <button
                        type="button"
                        className={styles.clearBtn}
                        onClick={() => updateDraft("author_photo", "")}
                      >
                        Прибрати
                      </button>
                    )}
                  </div>
                </div>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Категорія / тег</span>
                <input
                  className={styles.input}
                  value={draft.category}
                  onChange={(e) => updateDraft("category", e.target.value)}
                  placeholder="Біоінсектициди"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Рейтинг</span>
                <div className={styles.starsRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      filled={i < draft.rating}
                      onClick={() => updateDraft("rating", i + 1)}
                    />
                  ))}
                </div>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Дата (текст)</span>
                <input
                  className={styles.input}
                  value={draft.display_date}
                  onChange={(e) =>
                    updateDraft("display_date", e.target.value)
                  }
                  placeholder="Травень 2024"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Дата (ISO, для сортування)</span>
                <input
                  className={styles.input}
                  type="date"
                  value={
                    draft.date_iso
                      ? draft.date_iso.slice(0, 10)
                      : ""
                  }
                  onChange={(e) => updateDraft("date_iso", e.target.value)}
                />
              </label>

              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.fieldLabel}>Прив'язка до товару</span>
                <BrandSelect
                  triggerClassName={styles.input}
                  value={draft.product_id || ""}
                  onChange={(v) => updateDraft("product_id", v)}
                  options={[
                    { value: "", label: "— Без прив'язки (загальний відгук) —" },
                    ...products.map((p) => ({ value: p.id, label: `${p.name} (${p.slug})` })),
                  ]}
                  data-testid="review-product-link"
                />
              </label>

              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.fieldLabel}>Текст відгуку *</span>
                <textarea
                  className={styles.textarea}
                  rows={6}
                  value={draft.body}
                  onChange={(e) => updateDraft("body", e.target.value)}
                  placeholder="Поділіться вашим досвідом використання продукту…"
                />
              </label>

              <div className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.fieldLabel}>Статуси</span>
                <div className={styles.toggles}>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={draft.published}
                      onChange={(e) =>
                        updateDraft("published", e.target.checked)
                      }
                    />
                    Опубліковано (показувати на сайті)
                  </label>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={draft.highlighted}
                      onChange={(e) =>
                        updateDraft("highlighted", e.target.checked)
                      }
                    />
                    Виділений (показувати в блоці «Фермери обирають нас» на головній)
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={closeEditor}
                disabled={busy}
              >
                Скасувати
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={onSave}
                disabled={busy}
              >
                {busy ? "Збереження…" : "Зберегти"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
