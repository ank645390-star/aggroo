import React, { useEffect, useMemo, useState } from "react";
import {
  listCulturesAdmin,
  createCulture,
  patchCulture,
  deleteCulture,
  reorderCultures,
  type Culture,
} from "../../lib/cultures-api";
import styles from "./AdminCultures.module.css";

/* =====================================================================
   Admin Cultures — повноцінне керування секцією «Знайдіть рішення…».
   Кожна культура повністю редагується з адмінки.
   ===================================================================== */

type DraftCulture = {
  title: string;
  slug: string;
  problem_text: string;
  treatment_types: string;   // comma-separated в UI
  effective_for: string;     // comma-separated в UI
  image_url: string;
  image_alt: string;
  catalog_url: string;
  button_label: string;
  is_active: boolean;
  is_default_open: boolean;
};

const emptyDraft: DraftCulture = {
  title: "",
  slug: "",
  problem_text: "",
  treatment_types: "",
  effective_for: "",
  image_url: "",
  image_alt: "",
  catalog_url: "/catalog",
  button_label: "Переглянути лінійку",
  is_active: true,
  is_default_open: false,
};

const toDraft = (c: Culture): DraftCulture => ({
  title: c.title,
  slug: c.slug,
  problem_text: c.problem_text,
  treatment_types: (c.treatment_types || []).join(", "),
  effective_for: (c.effective_for || []).join(", "),
  image_url: c.image_url || "",
  image_alt: c.image_alt || "",
  catalog_url: c.catalog_url || "/catalog",
  button_label: c.button_label || "Переглянути лінійку",
  is_active: c.is_active,
  is_default_open: c.is_default_open,
});

const splitList = (s: string): string[] =>
  s
    .split(/[,\n]/g)
    .map((x) => x.trim())
    .filter(Boolean);

const AdminCultures: React.FC = () => {
  const [items, setItems] = useState<Culture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // create form
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DraftCulture>(emptyDraft);

  // editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftCulture>(emptyDraft);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCulturesAdmin();
      setItems(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити культури");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (c: Culture) => {
    setEditingId(c.id);
    setEditDraft(toDraft(c));
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyDraft);
  };

  const handleCreate = async () => {
    if (!draft.title.trim()) {
      setError("Назва обов'язкова");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createCulture({
        title: draft.title.trim(),
        slug: draft.slug.trim() || undefined,
        problem_text: draft.problem_text,
        treatment_types: splitList(draft.treatment_types),
        effective_for: splitList(draft.effective_for),
        image_url: draft.image_url.trim(),
        image_alt: draft.image_alt.trim(),
        catalog_url: draft.catalog_url.trim() || "/catalog",
        button_label: draft.button_label.trim() || "Переглянути лінійку",
        is_active: draft.is_active,
        is_default_open: draft.is_default_open,
      });
      setDraft(emptyDraft);
      setCreating(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Помилка створення");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editDraft.title.trim()) {
      setError("Назва обов'язкова");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await patchCulture(editingId, {
        title: editDraft.title.trim(),
        slug: editDraft.slug.trim() || undefined,
        problem_text: editDraft.problem_text,
        treatment_types: splitList(editDraft.treatment_types),
        effective_for: splitList(editDraft.effective_for),
        image_url: editDraft.image_url.trim(),
        image_alt: editDraft.image_alt.trim(),
        catalog_url: editDraft.catalog_url.trim() || "/catalog",
        button_label: editDraft.button_label.trim() || "Переглянути лінійку",
        is_active: editDraft.is_active,
        is_default_open: editDraft.is_default_open,
      });
      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Помилка збереження");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Видалити культуру «${title}»? Цю дію неможливо скасувати.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCulture(id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Помилка видалення");
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const arr = [...items];
    const j = index + direction;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    setItems(arr);
    setBusy(true);
    try {
      await reorderCultures(arr.map((it) => it.id));
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Помилка зміни порядку");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const activeCount = useMemo(
    () => items.filter((i) => i.is_active).length,
    [items]
  );

  // ===== Form fragment =====
  const renderForm = (
    d: DraftCulture,
    setD: (v: DraftCulture) => void,
    onSave: () => void,
    onCancel: () => void,
    saveLabel: string,
    testid: string
  ) => (
    <div className={styles.editForm}>
      <div className={styles.grid2}>
        <label className={styles.label}>
          Назва культури *
          <input
            className={styles.input}
            value={d.title}
            onChange={(e) => setD({ ...d, title: e.target.value })}
            placeholder="Польові культури"
            autoFocus
            data-testid={`${testid}-title`}
          />
        </label>
        <label className={styles.label}>
          Slug (URL-ідентифікатор)
          <input
            className={styles.input}
            value={d.slug}
            onChange={(e) => setD({ ...d, slug: e.target.value })}
            placeholder="polovi (авто з назви, якщо порожньо)"
            data-testid={`${testid}-slug`}
          />
        </label>
      </div>

      <label className={styles.label}>
        Опис проблеми / лід-абзац
        <textarea
          className={styles.textarea}
          rows={4}
          value={d.problem_text}
          onChange={(e) => setD({ ...d, problem_text: e.target.value })}
          placeholder="Совка на соняшнику, фузаріоз пшениці..."
          data-testid={`${testid}-problem`}
        />
      </label>

      <div className={styles.grid2}>
        <label className={styles.label}>
          Типи препаратів (через кому)
          <input
            className={styles.input}
            value={d.treatment_types}
            onChange={(e) => setD({ ...d, treatment_types: e.target.value })}
            placeholder="інокулянти, фунгіциди, мікродобрива"
            data-testid={`${testid}-types`}
          />
        </label>
        <label className={styles.label}>
          Ефективно для (через кому)
          <input
            className={styles.input}
            value={d.effective_for}
            onChange={(e) => setD({ ...d, effective_for: e.target.value })}
            placeholder="Соняшник, Пшениця, Кукурудза"
            data-testid={`${testid}-effective`}
          />
        </label>
      </div>

      <div className={styles.grid2}>
        <label className={styles.label}>
          URL картинки (або шлях /image.png)
          <input
            className={styles.input}
            value={d.image_url}
            onChange={(e) => setD({ ...d, image_url: e.target.value })}
            placeholder="/landscape-landscape-1@2x.png або https://..."
            data-testid={`${testid}-image-url`}
          />
        </label>
        <label className={styles.label}>
          Alt-текст картинки
          <input
            className={styles.input}
            value={d.image_alt}
            onChange={(e) => setD({ ...d, image_alt: e.target.value })}
            placeholder="Поле з пшеницею"
            data-testid={`${testid}-image-alt`}
          />
        </label>
      </div>

      <div className={styles.grid2}>
        <label className={styles.label}>
          Посилання на каталог (фільтр)
          <input
            className={styles.input}
            value={d.catalog_url}
            onChange={(e) => setD({ ...d, catalog_url: e.target.value })}
            placeholder="/catalog?category=polovi"
            data-testid={`${testid}-catalog-url`}
          />
        </label>
        <label className={styles.label}>
          Текст кнопки
          <input
            className={styles.input}
            value={d.button_label}
            onChange={(e) => setD({ ...d, button_label: e.target.value })}
            placeholder="Переглянути лінійку"
            data-testid={`${testid}-btn-label`}
          />
        </label>
      </div>

      <div className={styles.toggles}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={d.is_active}
            onChange={(e) => setD({ ...d, is_active: e.target.checked })}
            data-testid={`${testid}-active`}
          />
          <span>Активна (показувати на сайті)</span>
        </label>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={d.is_default_open}
            onChange={(e) => setD({ ...d, is_default_open: e.target.checked })}
            data-testid={`${testid}-default-open`}
          />
          <span>Відкрита за замовчуванням (тільки одна)</span>
        </label>
      </div>

      {d.image_url && (
        <div className={styles.preview}>
          <span className={styles.previewLabel}>Прев'ю картинки:</span>
          <img loading="lazy" decoding="async" src={d.image_url} alt={d.image_alt || d.title} className={styles.previewImg} />
        </div>
      )}

      <div className={styles.formRow}>
        <button type="button" className={styles.actBtn} onClick={onCancel} disabled={busy}>
          Скасувати
        </button>
        <button
          type="button"
          className={styles.actBtnPrimary}
          onClick={onSave}
          disabled={busy}
          data-testid={`${testid}-save`}
        >
          {busy ? "Зберігаємо…" : saveLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.shell} data-testid="admin-cultures-page">
      <div className={styles.toolbar}>
        <p className={styles.title}>
          Всього культур: <strong>{items.length}</strong>{" "}
          <span className={styles.dim}>· активних: {activeCount}</span>
        </p>
        {!creating && (
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => {
              setDraft(emptyDraft);
              setCreating(true);
              setEditingId(null);
            }}
            disabled={busy}
            data-testid="admin-cultures-add"
          >
            + Додати культуру
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {creating && (
        <div className={styles.item}>
          <div className={styles.itemHead}>
            <span className={styles.itemOrder}>Нова культура</span>
          </div>
          {renderForm(
            draft,
            setDraft,
            handleCreate,
            () => {
              setCreating(false);
              setDraft(emptyDraft);
              setError(null);
            },
            "Створити",
            "admin-cultures-new"
          )}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Завантаження…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          Поки немає жодної культури. Натисніть «Додати культуру».
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((c, i) => (
            <div
              className={`${styles.item} ${!c.is_active ? styles.itemInactive : ""}`}
              key={c.id}
              data-testid={`admin-cultures-item-${i}`}
            >
              <div className={styles.itemHead}>
                <div className={styles.itemHeadLeft}>
                  <span className={styles.itemOrder}>#{i + 1}</span>
                  <span className={styles.itemBadge}>
                    {c.is_active ? "активна" : "прихована"}
                  </span>
                  {c.is_default_open && (
                    <span className={styles.itemBadgeOpen}>
                      відкрита за замовч.
                    </span>
                  )}
                </div>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.actBtn}
                    onClick={() => move(i, -1)}
                    disabled={busy || i === 0}
                    title="Підняти вище"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.actBtn}
                    onClick={() => move(i, 1)}
                    disabled={busy || i === items.length - 1}
                    title="Опустити нижче"
                  >
                    ↓
                  </button>
                  {editingId === c.id ? (
                    <button
                      type="button"
                      className={styles.actBtn}
                      onClick={cancelEdit}
                      disabled={busy}
                    >
                      Закрити
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={styles.actBtn}
                        onClick={() => startEdit(c)}
                        disabled={busy}
                        data-testid={`admin-cultures-edit-${i}`}
                      >
                        Редагувати
                      </button>
                      <button
                        type="button"
                        className={`${styles.actBtn} ${styles.actBtnDanger}`}
                        onClick={() => handleDelete(c.id, c.title)}
                        disabled={busy}
                        data-testid={`admin-cultures-delete-${i}`}
                      >
                        Видалити
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === c.id ? (
                renderForm(
                  editDraft,
                  setEditDraft,
                  handleSaveEdit,
                  cancelEdit,
                  "Зберегти",
                  `admin-cultures-edit-${i}`
                )
              ) : (
                <div className={styles.summary}>
                  <div className={styles.summaryHead}>
                    <h3 className={styles.summaryTitle}>{c.title}</h3>
                    <span className={styles.slug}>/{c.slug}</span>
                  </div>
                  {c.problem_text && (
                    <p className={styles.summaryText}>{c.problem_text}</p>
                  )}
                  <div className={styles.metaRow}>
                    <div>
                      <span className={styles.metaLabel}>Типи:</span>{" "}
                      {c.treatment_types.length > 0
                        ? c.treatment_types.join(", ")
                        : <em className={styles.dim}>—</em>}
                    </div>
                    <div>
                      <span className={styles.metaLabel}>Для культур:</span>{" "}
                      {c.effective_for.length > 0
                        ? c.effective_for.join(", ")
                        : <em className={styles.dim}>—</em>}
                    </div>
                    <div>
                      <span className={styles.metaLabel}>Каталог:</span>{" "}
                      <code className={styles.code}>{c.catalog_url}</code>
                    </div>
                  </div>
                  {c.image_url && (
                    <div className={styles.thumbWrap}>
                      <img loading="lazy" decoding="async"
                        src={c.image_url}
                        alt={c.image_alt || c.title}
                        className={styles.thumb}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCultures;
