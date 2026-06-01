import React, { useEffect, useState } from "react";
import {
  listUpsells, createUpsell, updateUpsell, deleteUpsell, UpsellRule,
} from "../../lib/sales-api";
import { listProducts, Product } from "../../lib/products-api";
import styles from "./AdminSales.module.css";

const EMPTY: Partial<UpsellRule> = {
  title: "Часто разом беруть",
  source_product_slugs: [],
  target_product_slugs: [],
  priority: 0,
  active: true,
};

const AdminUpsells: React.FC = () => {
  const [rules, setRules] = useState<UpsellRule[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<Partial<UpsellRule>>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [r1, r2] = await Promise.all([
        listUpsells(),
        listProducts({ limit: 100 }),
      ]);
      setRules(r1.items);
      setAllProducts(r2.items as any);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити");
    }
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setForm(EMPTY); setEditing(null); };

  const toggleSlug = (key: "source_product_slugs" | "target_product_slugs", slug: string) => {
    setForm((prev) => {
      const arr = (prev[key] as string[]) || [];
      return { ...prev, [key]: arr.includes(slug) ? arr.filter((s) => s !== slug) : [...arr, slug] };
    });
  };

  const save = async () => {
    if (!form.title?.trim()) { setError("Назва обов'язкова"); return; }
    if (!(form.source_product_slugs || []).length || !(form.target_product_slugs || []).length) {
      setError("Оберіть хоча б 1 source і 1 target товар");
      return;
    }
    setBusy(true); setError(null);
    try {
      if (editing) await updateUpsell(editing, form);
      else await createUpsell(form);
      reset(); await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося зберегти");
    } finally { setBusy(false); }
  };

  const onEdit = (r: UpsellRule) => { setForm({ ...r }); setEditing(r.id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const onDelete = async (id: string) => {
    if (!window.confirm("Видалити правило?")) return;
    try { await deleteUpsell(id); await load(); }
    catch (e: any) { alert(e?.response?.data?.detail || "Не вдалося"); }
  };

  return (
    <div className={styles.wrap} data-testid="admin-upsells">
      {/* Form */}
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>{editing ? "Редагування правила" : "Нове правило допродажу"}</h3>
        <div className={styles.row2}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Назва</span>
            <input className={styles.input} value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Часто разом беруть" />
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Пріоритет</span>
              <input className={styles.input} type="number" value={form.priority ?? 0} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 0 })} />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Активне</span>
              <label style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 8 }}>
                <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                <span className={styles.muted}>Показувати на сайті</span>
              </label>
            </div>
          </div>
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Source продукти (тригери)</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 200, overflow: "auto", border: "1px solid #d6d8cc", padding: 8, borderRadius: 8, background: "#fbfbf6" }}>
              {allProducts.map((p) => {
                const on = (form.source_product_slugs || []).includes(p.slug);
                return (
                  <button key={p.slug} type="button" onClick={() => toggleSlug("source_product_slugs", p.slug)}
                    style={{ border: "1px solid " + (on ? "#1b4332" : "#d6d8cc"), background: on ? "#1b4332" : "#fff", color: on ? "#fff" : "#1f2a18", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Target продукти (рекомендації)</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 200, overflow: "auto", border: "1px solid #d6d8cc", padding: 8, borderRadius: 8, background: "#fbfbf6" }}>
              {allProducts.map((p) => {
                const on = (form.target_product_slugs || []).includes(p.slug);
                return (
                  <button key={p.slug} type="button" onClick={() => toggleSlug("target_product_slugs", p.slug)}
                    style={{ border: "1px solid " + (on ? "#b45309" : "#d6d8cc"), background: on ? "#b45309" : "#fff", color: on ? "#fff" : "#1f2a18", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={busy}>{editing ? "Зберегти" : "Створити"}</button>
          {editing && <button className={styles.btn} onClick={reset}>Скасувати</button>}
        </div>
      </section>

      {/* List */}
      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr><th>Назва</th><th>Source</th><th>Target</th><th>Пріор.</th><th>Статус</th><th></th></tr>
          </thead>
          <tbody>
            {rules.length === 0 && <tr><td colSpan={6} className={styles.tableEmpty}>Правил немає</td></tr>}
            {rules.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.title}</td>
                <td>{r.source_product_slugs.map((s) => <span key={s} className={styles.tag}>{s}</span>)}</td>
                <td>{r.target_product_slugs.map((s) => <span key={s} className={styles.tag} style={{ background: "#fde6c4", color: "#7c2d12" }}>{s}</span>)}</td>
                <td className={styles.mono}>{r.priority}</td>
                <td>{r.active ? <span style={{ color: "#0d9344", fontWeight: 600 }}>✓ активне</span> : <span className={styles.muted}>вимк.</span>}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button className={styles.btnGhost} style={{ padding: "4px 10px", border: "1px solid #d6d8cc", borderRadius: 6 }} onClick={() => onEdit(r)}>Ред.</button>
                  <button className={styles.btnDanger} style={{ padding: "4px 10px", border: "1px solid #d99c9c", borderRadius: 6 }} onClick={() => onDelete(r.id)}>Вид.</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUpsells;
