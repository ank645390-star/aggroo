import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  adminCreatePost,
  adminPatchPost,
  adminGetPost,
  adminUploadImage,
  type BlogPost,
} from "../../lib/blog-api";
import RichEditor from "../../components/blog/RichEditor";
import BrandSelect from "../../components/admin/BrandSelect";
import styles from "./AdminBlogEdit.module.css";

declare const process: { env: Record<string, string | undefined> };

/* =====================================================================
   AdminBlogEdit — форма створення / редагування статті блогу.
   Роути:
     /admin/blog/new          — створення
     /admin/blog/:id/edit     — редагування
   ===================================================================== */

const CATEGORIES_DEFAULT = [
  "Агрономія",
  "Біотехнології",
  "Інокулянти",
  "Грунт та вода",
  "Захист від хвороб",
  "Захист від шкідників",
  "Живлення",
  "Інструменти",
  "Логістика",
  "Вегетація",
  "Якість",
];

const AdminBlogEdit: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [coverAlt, setCoverAlt] = useState("");
  const [category, setCategory] = useState("Агрономія");
  const [tagsInput, setTagsInput] = useState("");
  const [hot, setHot] = useState(false);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);
    adminGetPost(id!)
      .then((p: BlogPost) => {
        if (cancelled) return;
        setTitle(p.title);
        setSlug(p.slug);
        setExcerpt(p.excerpt);
        setContentHtml(p.content_html || "");
        setCoverImage(p.cover_image || "");
        setCoverAlt(p.cover_alt || "");
        setCategory(p.category || "Агрономія");
        setTagsInput((p.tags || []).join(", "));
        setHot(!!p.hot);
        setStatus((p.status as "draft" | "published") || "draft");
        setSeoTitle(p.seo_title || "");
        setSeoDescription(p.seo_description || "");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.detail || "Не вдалося завантажити статтю");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const tagsArray = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsInput]
  );

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingCover(true);
    setError(null);
    try {
      const { url } = await adminUploadImage(file);
      const fullUrl = url.startsWith("http")
        ? url
        : `${process.env.REACT_APP_BACKEND_URL || ""}${url}`;
      setCoverImage(fullUrl);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Не вдалося завантажити файл");
    } finally {
      setUploadingCover(false);
    }
  };

  const buildPayload = (forceStatus?: "draft" | "published") => ({
    title: title.trim(),
    slug: slug.trim() || undefined,
    excerpt: excerpt.trim(),
    content_html: contentHtml,
    cover_image: coverImage.trim(),
    cover_alt: coverAlt.trim(),
    category: category.trim(),
    tags: tagsArray,
    hot,
    status: forceStatus || status,
    seo_title: seoTitle.trim(),
    seo_description: seoDescription.trim(),
  });

  const validate = (): string | null => {
    if (!title.trim()) return "Напишіть назву статті";
    if (!excerpt.trim()) return "Додайте короткий анонс (використовується в картці)";
    if (!contentHtml || contentHtml.replace(/<[^>]+>/g, "").trim().length < 5)
      return "Стаття надто коротка";
    if (!category.trim()) return "Вкажіть категорію";
    return null;
  };

  const handleSave = async (publishNow = false) => {
    const v = validate();
    if (v) {
      setError(v);
      window.scrollTo(0, 0);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(publishNow ? "published" : status);
      let result: BlogPost;
      if (isNew) {
        result = await adminCreatePost(payload);
      } else {
        result = await adminPatchPost(id!, payload);
      }
      setSavedAt(new Date().toLocaleTimeString("uk-UA"));
      if (publishNow) setStatus("published");
      if (isNew) {
        navigate(`/admin/blog/${result.id}/edit`, { replace: true });
      } else {
        // Update local state from response
        setTitle(result.title);
        setSlug(result.slug);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.empty}>Завантаження статті…</div>;
  }

  return (
    <div className={styles.shell} data-testid="admin-blog-edit">
      <div className={styles.toolbar}>
        <div>
          <Link to="/admin/blog" className={styles.backLink}>
            ← Назад до списку
          </Link>
          <h2 className={styles.pageTitle}>
            {isNew ? "Нова стаття" : `Редагування: ${title || "без назви"}`}
          </h2>
          {savedAt && <span className={styles.savedNote}>Збережено о {savedAt}</span>}
        </div>
        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => handleSave(false)}
            disabled={saving}
            data-testid="admin-blog-save"
          >
            {saving ? "Збереження…" : "Зберегти як чернетку"}
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => handleSave(true)}
            disabled={saving}
            data-testid="admin-blog-publish"
          >
            {saving ? "Публікація…" : status === "published" ? "Зберегти зміни" : "Опублікувати"}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        {/* Left column: title + content */}
        <div className={styles.colMain}>
          <label className={styles.field}>
            <span className={styles.label}>Назва статті <span className={styles.req}>*</span></span>
            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Наприклад: Як інокулянти фіксують атмосферний азот"
              data-testid="admin-blog-title"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              Короткий анонс (excerpt) <span className={styles.req}>*</span>
              <span className={styles.hint}>Використовується в картці блогу</span>
            </span>
            <textarea
              className={styles.textarea}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              placeholder="2–3 речення, що привернуть увагу читача"
              data-testid="admin-blog-excerpt"
            />
          </label>

          <div className={styles.field}>
            <span className={styles.label}>Вміст статті <span className={styles.req}>*</span></span>
            <RichEditor value={contentHtml} onChange={setContentHtml} minHeight={520} />
          </div>
        </div>

        {/* Right column: sidebar */}
        <aside className={styles.colSide}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Публікація</h3>
            <label className={styles.field}>
              <span className={styles.label}>Статус</span>
              <BrandSelect
                triggerClassName={styles.input}
                value={status}
                onChange={(v) => setStatus(v as "draft" | "published")}
                options={[
                  { value: "draft", label: "Чернетка" },
                  { value: "published", label: "Опубліковано" },
                ]}
                data-testid="admin-blog-status"
              />
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={hot}
                onChange={(e) => setHot(e.target.checked)}
                data-testid="admin-blog-hot"
              />
              <span>Позначити як «HOT» (з вогняним бейджем)</span>
            </label>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Титульне зображення</h3>
            {coverImage ? (
              <img className={styles.coverPreview} src={coverImage} alt={coverAlt} />
            ) : (
              <div className={styles.coverPlaceholder}>Поки немає обкладинки</div>
            )}
            <label className={styles.uploadBtn}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                onChange={handleCoverUpload}
                style={{ display: "none" }}
                data-testid="admin-blog-cover-input"
              />
              {uploadingCover ? "Завантаження…" : "Завантажити зображення"}
            </label>
            <label className={styles.field}>
              <span className={styles.label}>URL (або введіть вручну)</span>
              <input
                className={styles.input}
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://… або /api/uploads/blog/…"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Alt-текст</span>
              <input
                className={styles.input}
                value={coverAlt}
                onChange={(e) => setCoverAlt(e.target.value)}
                placeholder="Опис зображення для SEO"
              />
            </label>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Таксономія</h3>
            <label className={styles.field}>
              <span className={styles.label}>Категорія <span className={styles.req}>*</span></span>
              <input
                list="category-list"
                className={styles.input}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                data-testid="admin-blog-category"
              />
              <datalist id="category-list">
                {CATEGORIES_DEFAULT.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Теги <span className={styles.hint}>(через кому)</span></span>
              <input
                className={styles.input}
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="соя, азот, Bradyrhizobium"
                data-testid="admin-blog-tags"
              />
              {tagsArray.length > 0 && (
                <div className={styles.tagsPreview}>
                  {tagsArray.map((t) => (
                    <span key={t} className={styles.tagChip}>#{t}</span>
                  ))}
                </div>
              )}
            </label>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>SEO</h3>
            <label className={styles.field}>
              <span className={styles.label}>Сторінка (slug)</span>
              <input
                className={styles.input}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="залиште порожнім — згенерується з назви"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>SEO title</span>
              <input
                className={styles.input}
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="як відображатися в Google (якщо відрізняється від назви)"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>SEO description</span>
              <textarea
                className={styles.textarea}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={3}
                placeholder="Опис для пошуковиків (~155 символів)"
              />
            </label>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminBlogEdit;
