import React, { useEffect, useState } from "react";
import {
  listFaq,
  createFaq,
  patchFaq,
  deleteFaq,
  reorderFaq,
  type FaqItem,
} from "../../lib/faq-api";
import styles from "./AdminFaq.module.css";

/* =====================================================================
   Admin FAQ — створення, редагування, видалення та порядок питань.
   ===================================================================== */

const AdminFaq: React.FC = () => {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listFaq();
      setItems(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити FAQ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (it: FaqItem) => {
    setEditingId(it.id);
    setEditQ(it.q);
    setEditA(it.a);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditQ("");
    setEditA("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editQ.trim() || !editA.trim()) {
      setError("Питання та відповідь не можуть бути порожніми");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await patchFaq(editingId, { q: editQ.trim(), a: editA.trim() });
      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Помилка збереження");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!newQ.trim() || !newA.trim()) {
      setError("Питання та відповідь не можуть бути порожніми");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createFaq({ q: newQ.trim(), a: newA.trim() });
      setNewQ("");
      setNewA("");
      setCreating(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Помилка створення");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Видалити це питання?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteFaq(id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Помилка видалення");
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const newArr = [...items];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newArr.length) return;
    [newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]];
    setItems(newArr);
    setBusy(true);
    try {
      await reorderFaq(newArr.map((it) => it.id));
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Помилка зміни порядку");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.shell} data-testid="admin-faq-page">
      <div className={styles.toolbar}>
        <p className={styles.title}>
          Усього питань: <strong>{items.length}</strong>
        </p>
        {!creating && (
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setCreating(true)}
            disabled={busy}
            data-testid="admin-faq-add"
          >
            + Додати питання
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {creating && (
        <div className={styles.item}>
          <div className={styles.editForm}>
            <label className={styles.label}>
              Питання
              <input
                className={styles.input}
                value={newQ}
                onChange={(e) => setNewQ(e.target.value)}
                placeholder="Наприклад: Чим відрізняються біопрепарати від хімічних?"
                autoFocus
                data-testid="admin-faq-new-q"
              />
            </label>
            <label className={styles.label}>
              Відповідь
              <textarea
                className={styles.textarea}
                value={newA}
                onChange={(e) => setNewA(e.target.value)}
                placeholder="Розгорнута відповідь, кілька речень…"
                data-testid="admin-faq-new-a"
              />
            </label>
            <div className={styles.formRow}>
              <button
                type="button"
                className={styles.actBtn}
                onClick={() => { setCreating(false); setNewQ(""); setNewA(""); setError(null); }}
                disabled={busy}
              >
                Скасувати
              </button>
              <button
                type="button"
                className={styles.actBtnPrimary}
                onClick={handleCreate}
                disabled={busy}
                data-testid="admin-faq-save-new"
              >
                {busy ? "Зберігаємо…" : "Створити"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Завантаження…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Поки немає жодного питання. Натисніть «Додати питання».</div>
      ) : (
        <div className={styles.list}>
          {items.map((it, i) => (
            <div className={styles.item} key={it.id} data-testid={`admin-faq-item-${i}`}>
              <div className={styles.itemHead}>
                <span className={styles.itemOrder}>#{i + 1}</span>
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
                  {editingId === it.id ? (
                    <button
                      type="button"
                      className={styles.actBtn}
                      onClick={cancelEdit}
                      disabled={busy}
                    >
                      Скасувати
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={styles.actBtn}
                        onClick={() => startEdit(it)}
                        disabled={busy}
                        data-testid={`admin-faq-edit-${i}`}
                      >
                        Редагувати
                      </button>
                      <button
                        type="button"
                        className={`${styles.actBtn} ${styles.actBtnDanger}`}
                        onClick={() => handleDelete(it.id)}
                        disabled={busy}
                        data-testid={`admin-faq-delete-${i}`}
                      >
                        Видалити
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === it.id ? (
                <div className={styles.editForm}>
                  <label className={styles.label}>
                    Питання
                    <input
                      className={styles.input}
                      value={editQ}
                      onChange={(e) => setEditQ(e.target.value)}
                    />
                  </label>
                  <label className={styles.label}>
                    Відповідь
                    <textarea
                      className={styles.textarea}
                      value={editA}
                      onChange={(e) => setEditA(e.target.value)}
                    />
                  </label>
                  <div className={styles.formRow}>
                    <button
                      type="button"
                      className={styles.actBtnPrimary}
                      onClick={saveEdit}
                      disabled={busy}
                      data-testid={`admin-faq-save-${i}`}
                    >
                      {busy ? "Зберігаємо…" : "Зберегти"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={styles.q}>{it.q}</p>
                  <p className={styles.a}>{it.a}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFaq;
