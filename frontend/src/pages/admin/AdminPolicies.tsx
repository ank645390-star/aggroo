import React, { useEffect, useMemo, useState } from "react";
import {
  adminListPolicies,
  adminUpdatePolicy,
  type Policy,
  type PolicyType,
} from "../../lib/policies-api";
import RichEditor from "../../components/blog/RichEditor";
import { usePolicies } from "../../context/PolicyContext";
import styles from "./AdminPolicies.module.css";

/* =====================================================================
   AdminPolicies — редагування 3-х сайтових політик (cookie / privacy / terms).
   - Ліворуч: 3 вкладки.
   - Справа: вхід «Текст на кнопці», вхід «Назва в модалці», RichEditor.
   - Кнопка «Зберегти».
   ===================================================================== */

const TYPES: { key: PolicyType; nav: string; icon: string }[] = [
  { key: "cookie",  nav: "Cookie Policy",  icon: "🍪" },
  { key: "privacy", nav: "Privacy Policy", icon: "🔒" },
  { key: "terms",   nav: "Terms of Use",   icon: "📜" },
];

type Draft = {
  button_label: string;
  title: string;
  html_content: string;
  updated_at?: string;
};

const toDraft = (p?: Policy): Draft => ({
  button_label: p?.button_label || "",
  title: p?.title || "",
  html_content: p?.html_content || "",
  updated_at: p?.updated_at,
});

const AdminPolicies: React.FC = () => {
  const { reload } = usePolicies();
  const [activeTab, setActiveTab] = useState<PolicyType>("cookie");
  const [policies, setPolicies] = useState<Record<PolicyType, Policy | undefined>>({
    cookie: undefined, privacy: undefined, terms: undefined,
  });
  const [drafts, setDrafts] = useState<Record<PolicyType, Draft>>({
    cookie:  { button_label: "", title: "", html_content: "" },
    privacy: { button_label: "", title: "", html_content: "" },
    terms:   { button_label: "", title: "", html_content: "" },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [toast, setToast]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const items = await adminListPolicies();
        if (cancelled) return;
        const map: any = { cookie: undefined, privacy: undefined, terms: undefined };
        const draftMap: any = {};
        for (const it of items) {
          map[it.type] = it;
          draftMap[it.type] = toDraft(it);
        }
        setPolicies(map);
        setDrafts(draftMap);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.detail || "Не вдалося завантажити політики");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const active = drafts[activeTab];
  const original = policies[activeTab];
  const dirty = useMemo(() => {
    if (!original) return false;
    return (
      active.button_label !== original.button_label ||
      active.title !== original.title ||
      active.html_content !== original.html_content
    );
  }, [active, original]);

  const updateDraft = (patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], ...patch } }));
  };

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const updated = await adminUpdatePolicy(activeTab, {
        button_label: active.button_label.trim(),
        title: active.title.trim(),
        html_content: active.html_content,
      });
      setPolicies((prev) => ({ ...prev, [activeTab]: updated }));
      setDrafts((prev) => ({ ...prev, [activeTab]: toDraft(updated) }));
      await reload();
      setToast("Зміни збережено");
      setTimeout(() => setToast(null), 2200);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (original) {
      setDrafts((prev) => ({ ...prev, [activeTab]: toDraft(original) }));
    }
  };

  if (loading) {
    return <div className={styles.loading}>Завантаження політик…</div>;
  }

  return (
    <div className={styles.shell} data-testid="admin-policies">
      <aside className={styles.tabs} role="tablist" aria-orientation="vertical">
        {TYPES.map(({ key, nav, icon }) => (
          <button
            key={key}
            type="button"
            className={`${styles.tab} ${activeTab === key ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(key)}
            role="tab"
            aria-selected={activeTab === key}
            data-testid={`admin-policies-tab-${key}`}
          >
            <span className={styles.tabIcon}>{icon}</span>
            <span className={styles.tabLabel}>{nav}</span>
          </button>
        ))}
      </aside>

      <section className={styles.editor} role="tabpanel">
        <div className={styles.fieldsGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Текст кнопки (в футері)</span>
            <input
              type="text"
              className={styles.input}
              value={active.button_label}
              onChange={(e) => updateDraft({ button_label: e.target.value })}
              maxLength={120}
              placeholder="Наприклад: Cookie Policy"
              data-testid={`admin-policy-button-${activeTab}`}
            />
            <small className={styles.hint}>Це те що бачать користувачі в рядку футера.</small>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Назва в модальному вікні</span>
            <input
              type="text"
              className={styles.input}
              value={active.title}
              onChange={(e) => updateDraft({ title: e.target.value })}
              maxLength={300}
              placeholder="Наприклад: Політика використання cookie"
              data-testid={`admin-policy-title-${activeTab}`}
            />
            <small className={styles.hint}>Заголовок, який бачить користувач у вікні політики.</small>
          </label>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Текст політики (HTML, WYSIWYG)</span>
          <RichEditor
            value={active.html_content}
            onChange={(html) => updateDraft({ html_content: html })}
            placeholder="Почніть писати текст політики…"
            minHeight={420}
          />
        </div>

        {error && <div className={styles.errorBox} data-testid="admin-policies-error">{error}</div>}

        <div className={styles.actions}>
          <div className={styles.meta}>
            {original?.updated_at && (
              <span className={styles.metaText}>
                Останнє збереження:{" "}
                {new Date(original.updated_at).toLocaleString("uk-UA")}
              </span>
            )}
          </div>
          <div className={styles.btns}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={reset}
              disabled={!dirty || saving}
              data-testid="admin-policies-reset"
            >
              Скинути
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={save}
              disabled={!dirty || saving}
              data-testid="admin-policies-save"
            >
              {saving ? "Збереження…" : "Зберегти"}
            </button>
          </div>
        </div>
      </section>

      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </div>
  );
};

export default AdminPolicies;
