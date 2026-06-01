import React, { useEffect, useState } from "react";
import {
  listPartnersAdmin,
  createPartner,
  patchPartner,
  deletePartner,
  reorderPartners,
  type Partner,
} from "../../lib/trusted-partners-api";
import styles from "./AdminPartners.module.css";

/* =====================================================================
   Admin Partners — управління логотипами секції «Нам довіряють».
   Одне джерело для Welcome та About.
   ===================================================================== */

type Draft = {
  name: string;
  logo_url: string;
  link_url: string;
  alt: string;
  is_active: boolean;
};

const empty: Draft = {
  name: "",
  logo_url: "",
  link_url: "",
  alt: "",
  is_active: true,
};

const toDraft = (p: Partner): Draft => ({
  name: p.name,
  logo_url: p.logo_url || "",
  link_url: p.link_url || "",
  alt: p.alt || "",
  is_active: p.is_active,
});

const AdminPartners: React.FC = () => {
  const [items, setItems] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(empty);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPartnersAdmin();
      setItems(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити партнерів");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (p: Partner) => {
    setEditingId(p.id);
    setEditDraft(toDraft(p));
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(empty);
  };

  const handleCreate = async () => {
    if (!draft.name.trim()) {
      setError("Назва обов'язкова");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createPartner({
        name: draft.name.trim(),
        logo_url: draft.logo_url.trim(),
        link_url: draft.link_url.trim(),
        alt: draft.alt.trim() || draft.name.trim(),
        is_active: draft.is_active,
      });
      setDraft(empty);
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
    if (!editDraft.name.trim()) {
      setError("Назва обов'язкова");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await patchPartner(editingId, {
        name: editDraft.name.trim(),
        logo_url: editDraft.logo_url.trim(),
        link_url: editDraft.link_url.trim(),
        alt: editDraft.alt.trim() || editDraft.name.trim(),
        is_active: editDraft.is_active,
      });
      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Помилка збереження");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Видалити «${name}»?`)) return;
    setBusy(true);
    setError(null);
    try {
      await deletePartner(id);
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
      await reorderPartners(arr.map((it) => it.id));
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Помилка зміни порядку");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const renderForm = (
    d: Draft,
    setD: (v: Draft) => void,
    onSave: () => void,
    onCancel: () => void,
    saveLabel: string,
    testid: string
  ) => (
    <div className={styles.editForm}>
      <div className={styles.grid2}>
        <label className={styles.label}>
          Назва партнера *
          <input
            className={styles.input}
            value={d.name}
            onChange={(e) => setD({ ...d, name: e.target.value })}
            placeholder="Нібулон"
            autoFocus
            data-testid={`${testid}-name`}
          />
        </label>
        <label className={styles.label}>
          Alt-текст (доступність)
          <input
            className={styles.input}
            value={d.alt}
            onChange={(e) => setD({ ...d, alt: e.target.value })}
            placeholder="Автоматично з назви"
            data-testid={`${testid}-alt`}
          />
        </label>
      </div>

      <label className={styles.label}>
        URL логотипа (PNG/SVG з прозорим фоном)
        <input
          className={styles.input}
          value={d.logo_url}
          onChange={(e) => setD({ ...d, logo_url: e.target.value })}
          placeholder="/logo.png або https://..."
          data-testid={`${testid}-logo-url`}
        />
      </label>

      <label className={styles.label}>
        Посилання при кліку на логотип (опціонально)
        <input
          className={styles.input}
          value={d.link_url}
          onChange={(e) => setD({ ...d, link_url: e.target.value })}
          placeholder="https://nibulon.com"
          data-testid={`${testid}-link-url`}
        />
      </label>

      <div className={styles.toggles}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={d.is_active}
            onChange={(e) => setD({ ...d, is_active: e.target.checked })}
            data-testid={`${testid}-active`}
          />
          <span>Активний (показувати на сайті)</span>
        </label>
      </div>

      {d.logo_url && (
        <div className={styles.previewBox}>
          <span className={styles.previewLabel}>Прев'ю логотипа (єдиний формат боксу 180px):</span>
          <div className={styles.previewCell}>
            <img loading="lazy" decoding="async" src={d.logo_url} alt={d.alt || d.name} className={styles.previewImg} />
          </div>
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

  const activeCount = items.filter((i) => i.is_active).length;

  return (
    <div className={styles.shell} data-testid="admin-partners-page">
      <div className={styles.toolbar}>
        <p className={styles.title}>
          Всього логотипів: <strong>{items.length}</strong>{" "}
          <span className={styles.dim}>· активних: {activeCount}</span>
        </p>
        {!creating && (
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => {
              setDraft(empty);
              setCreating(true);
              setEditingId(null);
            }}
            disabled={busy}
            data-testid="admin-partners-add"
          >
            + Додати логотип
          </button>
        )}
      </div>

      <p className={styles.hint}>
        Логотипи відображаються в єдиному форматі (бокс 180px висотою, contain) на /welcome та /about
        — будь-який розмір оригінальної картинки впишеться без втрати пропорцій.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      {creating && (
        <div className={styles.item}>
          <div className={styles.itemHead}>
            <span className={styles.itemOrder}>Новий логотип</span>
          </div>
          {renderForm(
            draft,
            setDraft,
            handleCreate,
            () => {
              setCreating(false);
              setDraft(empty);
              setError(null);
            },
            "Створити",
            "admin-partners-new"
          )}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Завантаження…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Поки немає жодного партнера. Натисніть «Додати логотип».</div>
      ) : (
        <div className={styles.list}>
          {items.map((p, i) => (
            <div
              className={`${styles.item} ${!p.is_active ? styles.itemInactive : ""}`}
              key={p.id}
              data-testid={`admin-partners-item-${i}`}
            >
              <div className={styles.itemHead}>
                <div className={styles.itemHeadLeft}>
                  <span className={styles.itemOrder}>#{i + 1}</span>
                  <span className={styles.itemBadge}>
                    {p.is_active ? "активний" : "прихований"}
                  </span>
                </div>
                <div className={styles.itemActions}>
                  <button type="button" className={styles.actBtn} onClick={() => move(i, -1)} disabled={busy || i === 0} title="Підняти вище">↑</button>
                  <button type="button" className={styles.actBtn} onClick={() => move(i, 1)} disabled={busy || i === items.length - 1} title="Опустити нижче">↓</button>
                  {editingId === p.id ? (
                    <button type="button" className={styles.actBtn} onClick={cancelEdit} disabled={busy}>Закрити</button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={styles.actBtn}
                        onClick={() => startEdit(p)}
                        disabled={busy}
                        data-testid={`admin-partners-edit-${i}`}
                      >
                        Редагувати
                      </button>
                      <button
                        type="button"
                        className={`${styles.actBtn} ${styles.actBtnDanger}`}
                        onClick={() => handleDelete(p.id, p.name)}
                        disabled={busy}
                        data-testid={`admin-partners-delete-${i}`}
                      >
                        Видалити
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === p.id ? (
                renderForm(editDraft, setEditDraft, handleSaveEdit, cancelEdit, "Зберегти", `admin-partners-edit-${i}`)
              ) : (
                <div className={styles.summary}>
                  <div className={styles.summaryLeft}>
                    <h3 className={styles.summaryTitle}>{p.name}</h3>
                    {p.link_url && (
                      <a className={styles.link} href={p.link_url} target="_blank" rel="noopener noreferrer">
                        {p.link_url}
                      </a>
                    )}
                  </div>
                  <div className={styles.summaryRight}>
                    {p.logo_url ? (
                      <div className={styles.thumbBox}>
                        <img loading="lazy" decoding="async" src={p.logo_url} alt={p.alt || p.name} className={styles.thumbImg} />
                      </div>
                    ) : (
                      <span className={styles.dim}>—</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPartners;
