import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminGetProduct,
  adminListCategories,
  adminPatchProduct,
  adminUploadProductImage,
  type BulletItem,
  type DescriptionBlock,
  type FeatureChip,
  type Product,
  type ProductCategory,
  type TabBlock,
} from "../../lib/products-api";
import BrandSelect from "../../components/admin/BrandSelect";
import styles from "./AdminProductEdit.module.css";

const EMPTY_TAB = (title: string): TabBlock => ({ title, intro: "", items: [], note: "" });

const EMPTY_DESCRIPTION = (): DescriptionBlock => ({
  hero_image: "/tree.webp",
  title_line1: "Відновлення",
  title_line2: "після стресу.",
  title_subline: "Стабільний врожай.",
  chips: [
    { icon: "lightning", title: "Швидке відновлення",       body: "",  variant: "green" },
    { icon: "eco",       title: "Ідеальний pH-баланс води", body: "",  variant: "dark"  },
    { icon: "drop",      title: "Покращення поглинання",    body: "",  variant: "cream" },
  ],
  problem:  { title: "Проблема", intro_html: "", outro_html: "" },
  solution: { title: "Рішення",  intro_html: "", outro_html: "" },
});

type FormState = {
  name: string;
  slug: string;
  title_black: string;
  title_grey: string;
  short_desc: string;
  category: string;
  photo: string;
  photos: string[];
  packing: string;
  norm: string;
  storage_temp: string;
  storage_period: string;
  cultures: string;
  bacteria_genus: string;
  default_volume: string;
  price: number;
  variants: { volume: string; price: number; sku: string }[];
  in_stock: boolean;
  rating: number;
  reviews: number;
  manual_rating: number;
  manual_reviews: number;
  is_hit: boolean;
  is_new: boolean;
  is_agronomist_choice: boolean;
  sort_order: number;
  description_html: string;
  description_image: string;
  description: DescriptionBlock;
  dosage: TabBlock;
  composition: TabBlock;
  compatibility: TabBlock;
  specs: TabBlock;
  seo_title: string;
  seo_description: string;
  status: "draft" | "published";
};

const BASE: FormState = {
  name: "",
  slug: "",
  title_black: "",
  title_grey: "",
  short_desc: "",
  category: "",
  photo: "",
  photos: [],
  packing: "1, 5, 10 л",
  norm: "",
  storage_temp: "15-25°C",
  storage_period: "2 роки",
  cultures: "Всі культури",
  bacteria_genus: "",
  default_volume: "5 Л",
  price: 0,
  variants: [],
  in_stock: true,
  rating: 4.7,
  reviews: 0,
  manual_rating: 4.7,
  manual_reviews: 0,
  is_hit: false,
  is_new: false,
  is_agronomist_choice: false,
  sort_order: 0,
  description_html: "",
  description_image: "",
  description: EMPTY_DESCRIPTION(),
  dosage: EMPTY_TAB("Дозування"),
  composition: EMPTY_TAB("Склад"),
  compatibility: EMPTY_TAB("Сумісність"),
  specs: EMPTY_TAB("Характеристика"),
  seo_title: "",
  seo_description: "",
  status: "published",
};

const TabEditor: React.FC<{
  block: TabBlock;
  onChange: (next: TabBlock) => void;
  label: string;
}> = ({ block, onChange, label }) => {
  const setField = (key: keyof TabBlock, value: any) => onChange({ ...block, [key]: value });
  const addItem = () => onChange({ ...block, items: [...(block.items || []), { text: "" }] });
  const setItem = (i: number, text: string) => {
    const next = (block.items || []).slice();
    next[i] = { text };
    onChange({ ...block, items: next });
  };
  const removeItem = (i: number) => {
    const next = (block.items || []).filter((_, j) => j !== i);
    onChange({ ...block, items: next });
  };
  const moveItem = (i: number, dir: -1 | 1) => {
    const next = (block.items || []).slice();
    const ni = i + dir;
    if (ni < 0 || ni >= next.length) return;
    [next[i], next[ni]] = [next[ni], next[i]];
    onChange({ ...block, items: next });
  };
  return (
    <div className={styles.tabEditor}>
      <div className={styles.tabEditorHeader}>{label}</div>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Заголовок</span>
        <input className={styles.input} value={block.title || ""} onChange={(e) => setField("title", e.target.value)} />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Вступний абзац (необов'язково)</span>
        <textarea className={styles.textarea} rows={2} value={block.intro || ""} onChange={(e) => setField("intro", e.target.value)} />
      </label>
      <div className={styles.fieldLabel}>Пункти списку (підтримує вбудований HTML — наприклад &lt;b&gt;..&lt;/b&gt;)</div>
      <div className={styles.bullets}>
        {(block.items || []).map((it: BulletItem, i: number) => (
          <div key={i} className={styles.bulletRow}>
            <input
              className={styles.input}
              value={it.text}
              placeholder={`Пункт ${i + 1}`}
              onChange={(e) => setItem(i, e.target.value)}
            />
            <div className={styles.bulletActions}>
              <button type="button" className={styles.miniBtn} onClick={() => moveItem(i, -1)} disabled={i === 0} title="Вище">↑</button>
              <button type="button" className={styles.miniBtn} onClick={() => moveItem(i, +1)} disabled={i === (block.items || []).length - 1} title="Нижче">↓</button>
              <button type="button" className={styles.miniBtnDanger} onClick={() => removeItem(i)} title="Видалити">×</button>
            </div>
          </div>
        ))}
        <button type="button" className={styles.addBulletBtn} onClick={addItem}>+ Додати пункт</button>
      </div>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Примітка під списком (необов'язково)</span>
        <textarea className={styles.textarea} rows={2} value={block.note || ""} onChange={(e) => setField("note", e.target.value)} />
      </label>
    </div>
  );
};

const AdminProductEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isNew = !id;
  const [form, setForm] = useState<FormState>(BASE);
  const [original, setOriginal] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dosage" | "composition" | "compatibility" | "specs">("dosage");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLInputElement>(null);

  /* Load categories + product if editing */
  useEffect(() => {
    let cancelled = false;
    adminListCategories()
      .then((r) => { if (!cancelled) setCategories(r.items); })
      .catch(() => {});
    if (!isNew && id) {
      setLoading(true);
      adminGetProduct(id)
        .then((p) => {
          if (cancelled) return;
          setOriginal(p);
          setForm({
            name: p.name || "",
            slug: p.slug || "",
            title_black: (p as any).title_black || "",
            title_grey: (p as any).title_grey || "",
            short_desc: p.short_desc || "",
            category: p.category || "",
            photo: p.photo || "",
            photos: p.photos || [],
            packing: p.packing || "",
            norm: p.norm || "",
            storage_temp: (p as any).storage_temp || "15-25°C",
            storage_period: (p as any).storage_period || "2 роки",
            cultures: (p as any).cultures ?? "Всі культури",
            bacteria_genus: (p as any).bacteria_genus ?? "",
            default_volume: p.default_volume || "5 Л",
            price: Number(p.price || 0),
            variants: Array.isArray((p as any).variants) ? (p as any).variants.map((v: any) => ({
              volume: v.volume || "",
              price: Number(v.price || 0),
              sku: v.sku || "",
            })) : [],
            in_stock: !!p.in_stock,
            rating: Number(p.rating || 4.7),
            reviews: Number(p.reviews || 0),
            manual_rating: Number((p as any).manual_rating ?? p.rating ?? 4.7),
            manual_reviews: Number((p as any).manual_reviews ?? p.reviews ?? 0),
            is_hit: !!p.is_hit,
            is_new: !!p.is_new,
            is_agronomist_choice: !!(p as any).is_agronomist_choice,
            sort_order: Number(p.sort_order || 0),
            description_html: p.description_html || "",
            description_image: p.description_image || "",
            description: p.description || EMPTY_DESCRIPTION(),
            dosage: p.dosage || EMPTY_TAB("Дозування"),
            composition: p.composition || EMPTY_TAB("Склад"),
            compatibility: p.compatibility || EMPTY_TAB("Сумісність"),
            specs: p.specs || EMPTY_TAB("Характеристика"),
            seo_title: p.seo_title || "",
            seo_description: p.seo_description || "",
            status: (p.status || "published") as any,
          });
        })
        .catch((e) => { if (!cancelled) setError(e?.response?.data?.detail || "Не вдалося завантажити товар"); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [id, isNew]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (statusOverride?: "draft" | "published") => {
    if (saving) return;
    if (!form.name.trim()) { setError("Назва обов'язкова"); return; }
    if (!form.category) { setError("Оберіть категорію"); return; }
    setSaving(true);
    setError(null);
    const payload: any = { ...form };
    if (statusOverride) payload.status = statusOverride;
    try {
      let res: Product;
      if (isNew) {
        res = await adminCreateProduct(payload);
        navigate(`/admin/products/${res.id}/edit`, { replace: true });
      } else if (id) {
        res = await adminPatchProduct(id, payload);
      } else { return; }
      setOriginal(res);
      setForm((prev) => ({ ...prev, slug: res.slug }));
      setSavedAt(new Date().toLocaleTimeString("uk-UA"));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося зберегти");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm("Видалити цей товар?")) return;
    try {
      await adminDeleteProduct(id);
      navigate("/admin/products");
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Не вдалося видалити");
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // Upload each file sequentially; UI shows new photos as they land.
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        try {
          const r = await adminUploadProductImage(file);
          uploaded.push(r.url);
        } catch (innerErr: any) {
          // Continue with rest, but capture first error message.
          alert(innerErr?.response?.data?.detail || `Не вдалося завантажити ${file.name}`);
        }
      }
      if (uploaded.length > 0) {
        setForm((prev) => {
          const next = [...prev.photos];
          uploaded.forEach((u) => { if (!next.includes(u)) next.push(u); });
          return { ...prev, photos: next, photo: prev.photo || next[0] };
        });
      }
    } finally {
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const movePhoto = (url: string, dir: -1 | 1) => {
    setForm((prev) => {
      const arr = [...prev.photos];
      const idx = arr.indexOf(url);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= arr.length) return prev;
      const tmp = arr[idx];
      arr[idx] = arr[next];
      arr[next] = tmp;
      // First photo is always treated as cover, mirror that in `photo` field.
      return { ...prev, photos: arr, photo: arr[0] || prev.photo };
    });
  };

  const handleUploadDescImage = async (_e: React.ChangeEvent<HTMLInputElement>) => {
    // legacy — replaced by inline upload inside the new Опис editor.
    return;
  };

  const removePhoto = (url: string) => {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p !== url),
      photo: prev.photo === url ? (prev.photos.find((p) => p !== url) || "") : prev.photo,
    }));
  };

  const setCover = (url: string) => setForm((prev) => ({ ...prev, photo: url }));

  const activeTabBlock = useMemo(() => form[activeTab], [form, activeTab]);

  if (loading) return <div className={styles.loading}>Завантаження…</div>;

  return (
    <div className={styles.shell}>
      <div className={styles.topBar}>
        <Link to="/admin/products" className={styles.backLink}>← До списку</Link>
        <div className={styles.topActions}>
          {savedAt && <span className={styles.savedAt}>Збережено в {savedAt}</span>}
          {!isNew && (
            <button type="button" className={styles.deleteBtn} onClick={handleDelete}>Видалити</button>
          )}
          <button type="button" className={styles.draftBtn} onClick={() => handleSave("draft")} disabled={saving}>Зберегти чернетку</button>
          <button type="button" className={styles.publishBtn} onClick={() => handleSave("published")} disabled={saving} data-testid="admin-product-save">
            {saving ? "Збереження…" : "Опублікувати"}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        {/* ============ LEFT ============ */}
        <div className={styles.colLeft}>
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Основна інформація</h3>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Назва товару *</span>
              <input className={styles.input} value={form.name} onChange={(e) => setField("name", e.target.value)} data-testid="admin-product-name" />
              <span className={styles.fieldHint}>
                Коротка назва товару — використовується у каталозі, кошику,
                breadcrumb (наприклад: "Флорес").
              </span>
            </label>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>
                Заголовок H1 — двокольоровий (BLACK + GREY)
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className={styles.field} style={{ margin: 0 }}>
                  <span className={styles.fieldLabel} style={{ color: "#2c2c27" }}>
                    Чорна частина (BLACK)
                  </span>
                  <input
                    className={styles.input}
                    value={form.title_black}
                    onChange={(e) => setField("title_black", e.target.value)}
                    placeholder="наприклад: Антистресант"
                    data-testid="admin-product-title-black"
                  />
                </label>
                <label className={styles.field} style={{ margin: 0 }}>
                  <span className={styles.fieldLabel} style={{ color: "#93928c" }}>
                    Сіра частина (GREY)
                  </span>
                  <input
                    className={styles.input}
                    value={form.title_grey}
                    onChange={(e) => setField("title_grey", e.target.value)}
                    placeholder={`наприклад: зі стимулюючим ефектом "ФЛОРЕС" (FLORES)`}
                    data-testid="admin-product-title-grey"
                  />
                </label>
              </div>
              <span className={styles.fieldHint}>
                На сторінці товару H1 рендериться як два спани:
                <strong style={{ color: "#2c2c27" }}> чорна частина </strong>
                та
                <strong style={{ color: "#93928c" }}> сіра частина </strong>
                (через пробіл). Якщо обидві порожні — буде показано звичайну "Назва товару".
              </span>
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Короткий опис (під назвою на карточці)</span>
              <input className={styles.input} value={form.short_desc} onChange={(e) => setField("short_desc", e.target.value)} placeholder="наприклад: потужний біоінсектицид широкого спектру" />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Slug (авто — якщо порожнє)</span>
              <input className={styles.input} value={form.slug} onChange={(e) => setField("slug", e.target.value)} placeholder="наприклад: venator" />
            </label>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Опис (Figma-дизайн)</h3>
            <p className={styles.descHelp}>
              Цей блок відображається у вкладці «Опис» на сторінці товару: hero-зображення (дерево), заголовок з підрядком, 3 фічеблоки (chips) поверх зображення, і дві колонки «Проблема / Рішення».
            </p>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Hero-зображення</span>
              <div className={styles.imageRow}>
                {form.description?.hero_image ? (
                  <div className={styles.imagePreview}>
                    <img src={form.description.hero_image} alt="Hero" />
                    <button
                      type="button"
                      className={styles.removeImg}
                      onClick={() => setField("description", { ...form.description, hero_image: "/tree.webp" })}
                      title="Скинути до /tree.webp"
                    >×</button>
                  </div>
                ) : null}
                <input
                  ref={descInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const r = await adminUploadProductImage(file);
                      setField("description", { ...form.description, hero_image: r.url });
                    } catch (err: any) {
                      alert(err?.response?.data?.detail || "Не вдалося завантажити");
                    } finally {
                      if (descInputRef.current) descInputRef.current.value = "";
                    }
                  }}
                  style={{ display: "none" }}
                  id="desc-hero-img"
                />
                <label htmlFor="desc-hero-img" className={styles.uploadBtn}>+ Завантажити</label>
                <input
                  className={styles.input}
                  placeholder="або URL (за замовч. /tree.webp)"
                  value={form.description?.hero_image || ""}
                  onChange={(e) => setField("description", { ...form.description, hero_image: e.target.value })}
                />
              </div>
            </label>

            <div className={styles.row2}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Заголовок — рядок 1</span>
                <input
                  className={styles.input}
                  value={form.description?.title_line1 || ""}
                  onChange={(e) => setField("description", { ...form.description, title_line1: e.target.value })}
                  placeholder="Відновлення"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Заголовок — рядок 2</span>
                <input
                  className={styles.input}
                  value={form.description?.title_line2 || ""}
                  onChange={(e) => setField("description", { ...form.description, title_line2: e.target.value })}
                  placeholder="після стресу."
                />
              </label>
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Підрядок під заголовком</span>
              <input
                className={styles.input}
                value={form.description?.title_subline || ""}
                onChange={(e) => setField("description", { ...form.description, title_subline: e.target.value })}
                placeholder="Стабільний врожай."
              />
            </label>

            {/* === Chips (до 3) === */}
            <div className={styles.subSectionTitle}>Фічеблоки (chips) поверх hero (макс. 3)</div>
            <div className={styles.bullets}>
              {(form.description?.chips || []).map((chip, i) => (
                <div key={i} className={styles.chipCard}>
                  <div className={styles.chipCardHead}>
                    <span className={styles.chipBadge}>Chip {i + 1}</span>
                    <button
                      type="button"
                      className={styles.miniBtnDanger}
                      onClick={() => {
                        const next = (form.description?.chips || []).filter((_, j) => j !== i);
                        setField("description", { ...form.description, chips: next });
                      }}
                      title="Видалити chip"
                    >× Видалити</button>
                  </div>
                  <div className={styles.row2}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Іконка</span>
                      <BrandSelect
                        triggerClassName={styles.input}
                        value={chip.icon}
                        onChange={(v) => {
                          const next = (form.description?.chips || []).slice();
                          next[i] = { ...chip, icon: v as FeatureChip["icon"] };
                          setField("description", { ...form.description, chips: next });
                        }}
                        options={[
                          { value: "lightning", label: "⚡ Блискавка (швидкість)" },
                          { value: "eco", label: "🌿 Еко (захист)" },
                          { value: "drop", label: "💧 Крапля (вода)" },
                          { value: "shield", label: "🛡️ Щит" },
                          { value: "leaf", label: "🍃 Лист" },
                        ]}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Колірний варіант</span>
                      <BrandSelect
                        triggerClassName={styles.input}
                        value={chip.variant}
                        onChange={(v) => {
                          const next = (form.description?.chips || []).slice();
                          next[i] = { ...chip, variant: v as FeatureChip["variant"] };
                          setField("description", { ...form.description, chips: next });
                        }}
                        options={[
                          { value: "green", label: "Зелений (олив-зелений)" },
                          { value: "dark", label: "Темний" },
                          { value: "cream", label: "Кремовий" },
                        ]}
                      />
                    </label>
                  </div>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Заголовок</span>
                    <input
                      className={styles.input}
                      value={chip.title}
                      onChange={(e) => {
                        const next = (form.description?.chips || []).slice();
                        next[i] = { ...chip, title: e.target.value };
                        setField("description", { ...form.description, chips: next });
                      }}
                      placeholder="наприклад: Швидке відновлення"
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Опис</span>
                    <textarea
                      className={styles.textarea}
                      rows={2}
                      value={chip.body}
                      onChange={(e) => {
                        const next = (form.description?.chips || []).slice();
                        next[i] = { ...chip, body: e.target.value };
                        setField("description", { ...form.description, chips: next });
                      }}
                    />
                  </label>
                </div>
              ))}
              {(form.description?.chips?.length || 0) < 3 && (
                <button
                  type="button"
                  className={styles.addBulletBtn}
                  onClick={() => {
                    const next = [...(form.description?.chips || [])];
                    const palette: FeatureChip["variant"][] = ["green", "dark", "cream"];
                    next.push({
                      icon: "lightning",
                      title: "",
                      body: "",
                      variant: palette[next.length] || "green",
                    });
                    setField("description", { ...form.description, chips: next });
                  }}
                >+ Додати chip</button>
              )}
            </div>

            {/* === Problem === */}
            <div className={styles.subSectionTitle}>Колонка «Проблема»</div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Заголовок (бейдж)</span>
              <input
                className={styles.input}
                value={form.description?.problem?.title || ""}
                onChange={(e) => setField("description", {
                  ...form.description,
                  problem: { ...form.description?.problem, title: e.target.value },
                })}
                placeholder="Проблема"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Основний текст (HTML, підтримує &lt;b&gt;..&lt;/b&gt;)</span>
              <textarea
                className={styles.textarea}
                rows={4}
                value={form.description?.problem?.intro_html || ""}
                onChange={(e) => setField("description", {
                  ...form.description,
                  problem: { ...form.description?.problem, intro_html: e.target.value },
                })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Висновок (другий абзац, HTML)</span>
              <textarea
                className={styles.textarea}
                rows={3}
                value={form.description?.problem?.outro_html || ""}
                onChange={(e) => setField("description", {
                  ...form.description,
                  problem: { ...form.description?.problem, outro_html: e.target.value },
                })}
              />
            </label>

            {/* === Solution === */}
            <div className={styles.subSectionTitle}>Колонка «Рішення»</div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Заголовок (бейдж)</span>
              <input
                className={styles.input}
                value={form.description?.solution?.title || ""}
                onChange={(e) => setField("description", {
                  ...form.description,
                  solution: { ...form.description?.solution, title: e.target.value },
                })}
                placeholder="Рішення"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Основний текст (HTML, &lt;b&gt;..&lt;/b&gt;)</span>
              <textarea
                className={styles.textarea}
                rows={5}
                value={form.description?.solution?.intro_html || ""}
                onChange={(e) => setField("description", {
                  ...form.description,
                  solution: { ...form.description?.solution, intro_html: e.target.value },
                })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Висновок (HTML, можна використовувати &lt;span style="color:#b3d217"&gt;...&lt;/span&gt;)</span>
              <textarea
                className={styles.textarea}
                rows={3}
                value={form.description?.solution?.outro_html || ""}
                onChange={(e) => setField("description", {
                  ...form.description,
                  solution: { ...form.description?.solution, outro_html: e.target.value },
                })}
              />
            </label>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Продуктові вкладки</h3>
            <div className={styles.tabBar}>
              {[
                ["dosage", "Дозування"],
                ["composition", "Склад"],
                ["compatibility", "Сумісність"],
                ["specs", "Характеристика"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.tabBtn} ${activeTab === key ? styles.tabBtnActive : ""}`}
                  onClick={() => setActiveTab(key as any)}
                >{label}</button>
              ))}
            </div>
            <TabEditor
              block={activeTabBlock}
              onChange={(next) => setField(activeTab, next)}
              label={`Редагування вкладки`}
            />
          </section>
        </div>

        {/* ============ RIGHT ============ */}
        <aside className={styles.colRight}>
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Публікація</h3>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={form.status === "published"} onChange={(e) => setField("status", e.target.checked ? "published" : "draft")} />
              <span>Опубліковано</span>
            </label>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={form.in_stock} onChange={(e) => setField("in_stock", e.target.checked)} />
              <span>В наявності</span>
            </label>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={form.is_hit} onChange={(e) => setField("is_hit", e.target.checked)} />
              <span>Хіт продажу (HOT)</span>
            </label>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={form.is_new} onChange={(e) => setField("is_new", e.target.checked)} />
              <span>Новинка</span>
            </label>
            <label className={styles.checkRow} data-testid="admin-product-agronomist-choice">
              <input
                type="checkbox"
                checked={form.is_agronomist_choice}
                onChange={(e) => setField("is_agronomist_choice", e.target.checked)}
              />
              <span>Вибір агрономів (відображати на Welcome)</span>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Порядок сортування</span>
              <input className={styles.input} type="number" value={form.sort_order} onChange={(e) => setField("sort_order", Number(e.target.value) || 0)} />
            </label>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Ціна і обсяг</h3>
            <div className={styles.row2}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Базова ціна, ₴/л</span>
                <input className={styles.input} type="number" step="0.01" value={form.price} onChange={(e) => setField("price", Number(e.target.value) || 0)} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Дефолтний обсяг</span>
                <input className={styles.input} value={form.default_volume} onChange={(e) => setField("default_volume", e.target.value)} />
              </label>
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Тара (наприклад: 1, 5, 10 л)</span>
              <input className={styles.input} value={form.packing} onChange={(e) => setField("packing", e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Норма витрати</span>
              <input className={styles.input} value={form.norm} onChange={(e) => setField("norm", e.target.value)} placeholder="наприклад: 0,5–1,0 л/га" />
            </label>
            <div className={styles.row2}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Зберігання (температура)</span>
                <input className={styles.input} value={form.storage_temp} onChange={(e) => setField("storage_temp", e.target.value)} placeholder="наприклад: 15-25°C" />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Період зберігання</span>
                <input className={styles.input} value={form.storage_period} onChange={(e) => setField("storage_period", e.target.value)} placeholder="наприклад: 2 роки" />
              </label>
            </div>
            <div className={styles.row2}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Культури</span>
                <input className={styles.input} value={form.cultures} onChange={(e) => setField("cultures", e.target.value)} placeholder="наприклад: Всі культури" />
                <span className={styles.fieldHint}>Відображається у блоці-картці на сторінці товару поряд з іконкою «коробка». Залиште порожнім, щоб приховати рядок.</span>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Бактерії роду</span>
                <input className={styles.input} value={form.bacteria_genus} onChange={(e) => setField("bacteria_genus", e.target.value)} placeholder="наприклад: Bacillus subtilis" />
                <span className={styles.fieldHint}>Відображається з іконкою «атом». Залиште порожнім — рядок не показується (актуально для допоміжних речовин / родентицидів).</span>
              </label>
            </div>

            <div className={styles.subSectionTitle}>Варіанти ціни по тарі</div>
            <p className={styles.descHelp}>
              Якщо додати варіанти, на сторінці товару покажуться кнопки об’єму (1Л, 5Л, 10Л тощо), кожна — зі своєю ціною. Якщо залишити порожнім, ціна розрахується автоматично з базової (₴/л × обсяг).
            </p>
            <div className={styles.bullets}>
              {(form.variants || []).map((v, i) => (
                <div key={i} className={styles.variantRow}>
                  <input
                    className={styles.input}
                    style={{ flex: "0 0 110px" }}
                    placeholder="Обсяг, напр. 5 Л"
                    value={v.volume}
                    onChange={(e) => {
                      const next = form.variants.slice();
                      next[i] = { ...v, volume: e.target.value };
                      setField("variants", next);
                    }}
                  />
                  <input
                    className={styles.input}
                    style={{ flex: "0 0 130px" }}
                    type="number"
                    step="0.01"
                    placeholder="Ціна, ₴"
                    value={v.price}
                    onChange={(e) => {
                      const next = form.variants.slice();
                      next[i] = { ...v, price: Number(e.target.value) || 0 };
                      setField("variants", next);
                    }}
                  />
                  <input
                    className={styles.input}
                    style={{ flex: "1" }}
                    placeholder="SKU (необов'язково)"
                    value={v.sku}
                    onChange={(e) => {
                      const next = form.variants.slice();
                      next[i] = { ...v, sku: e.target.value };
                      setField("variants", next);
                    }}
                  />
                  <button
                    type="button"
                    className={styles.miniBtnDanger}
                    onClick={() => setField("variants", form.variants.filter((_, j) => j !== i))}
                    title="Видалити варіант"
                  >×</button>
                </div>
              ))}
              <button
                type="button"
                className={styles.addBulletBtn}
                onClick={() => setField("variants", [...(form.variants || []), { volume: "", price: 0, sku: "" }])}
              >+ Додати варіант ціни (тара)</button>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Категорія</h3>
            <BrandSelect
              triggerClassName={styles.input}
              value={form.category}
              onChange={(v) => setField("category", v)}
              options={[
                { value: "", label: "— Оберіть категорію —" },
                ...categories.map((c) => ({ value: c.slug, label: `${c.label} (${c.slug})` })),
              ]}
              data-testid="admin-product-category"
            />
            <Link to="/admin/product-categories" className={styles.linkSmall}>Налаштувати категорії →</Link>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Фотографії (рекомендовано 5 шт., перше = обкладинка)</h3>
            <p className={styles.descHelp}>
              Можна завантажувати кілька фото одразу. Перетягуйте стрілками для зміни порядку
              (перше фото — головне, інші відображаються як мініатюри на картці товару).
              Рекомендовано <b>5 фотографій</b> для повного огляду продукту.
            </p>
            <div className={styles.gallery}>
              {form.photos.map((p, idx) => (
                <div
                  key={p}
                  className={`${styles.galleryItem} ${form.photo === p ? styles.galleryItemActive : ""}`}
                >
                  <img src={p} alt="" />
                  <div className={styles.galleryBadge}>{idx + 1}</div>
                  <div className={styles.galleryActions}>
                    <div className={styles.galleryOrder}>
                      <button
                        type="button"
                        className={styles.miniBtn}
                        onClick={() => movePhoto(p, -1)}
                        disabled={idx === 0}
                        aria-label="Перемістити вліво"
                        title="Перемістити вліво"
                      >‹</button>
                      <button
                        type="button"
                        className={styles.miniBtn}
                        onClick={() => movePhoto(p, 1)}
                        disabled={idx === form.photos.length - 1}
                        aria-label="Перемістити вправо"
                        title="Перемістити вправо"
                      >›</button>
                    </div>
                    <div className={styles.galleryRightActions}>
                      <button
                        type="button"
                        className={styles.miniBtn}
                        onClick={() => setCover(p)}
                        disabled={form.photo === p}
                        title="Зробити обкладинкою"
                      >Обклад.</button>
                      <button
                        type="button"
                        className={styles.miniBtnDanger}
                        onClick={() => removePhoto(p)}
                        title="Видалити"
                      >×</button>
                    </div>
                  </div>
                </div>
              ))}
              {form.photos.length === 0 && (
                <div className={styles.galleryEmpty}>
                  Поки немає фото. Натисніть «Завантажити фото» нижче ↓
                </div>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUploadPhoto}
              style={{ display: "none" }}
              id="photo-up"
            />
            <label
              htmlFor="photo-up"
              className={styles.uploadBtn}
              data-testid="admin-product-upload-photo"
            >
              + Завантажити фото (можна декілька)
            </label>
            <input
              className={styles.input}
              placeholder="або вставте URL фото та натисніть Enter"
              defaultValue=""
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const inputEl = e.currentTarget as HTMLInputElement;
                  const v = inputEl.value.trim();
                  if (v) {
                    setForm((prev) => ({
                      ...prev,
                      photos: prev.photos.includes(v) ? prev.photos : [...prev.photos, v],
                      photo: prev.photo || v,
                    }));
                    inputEl.value = "";
                  }
                }
              }}
            />
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Рейтинг і відгуки</h3>
            <p className={styles.descHelp}>
              <b>Базова оцінка</b> та <b>базова к-ть відгуків</b> — це значення, які відображаються
              на картці товару, поки немає реальних відгуків клієнтів. Коли клієнти залишатимуть
              реальні відгуки, рейтинг автоматично перерахується як зважене середнє
              (базове + реальні).
            </p>
            <div className={styles.row2}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Базова оцінка (0–5)</span>
                <input
                  className={styles.input}
                  type="number" step="0.1" min="0" max="5"
                  value={form.manual_rating}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(5, Number(e.target.value) || 0));
                    setField("manual_rating", v);
                  }}
                  data-testid="admin-product-manual-rating"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Базова к-ть відгуків</span>
                <input
                  className={styles.input}
                  type="number" min="0"
                  value={form.manual_reviews}
                  onChange={(e) => setField("manual_reviews", Math.max(0, Number(e.target.value) || 0))}
                  data-testid="admin-product-manual-reviews"
                />
              </label>
            </div>
            <div className={styles.row2} style={{ marginTop: 10, opacity: 0.85 }}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ефективна оцінка (read-only)</span>
                <input className={styles.input} type="number" step="0.1" value={form.rating} readOnly />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ефективна к-ть відгуків (read-only)</span>
                <input className={styles.input} type="number" value={form.reviews} readOnly />
              </label>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>SEO</h3>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>SEO Title</span>
              <input className={styles.input} value={form.seo_title} onChange={(e) => setField("seo_title", e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>SEO Description</span>
              <textarea className={styles.textarea} rows={3} value={form.seo_description} onChange={(e) => setField("seo_description", e.target.value)} />
            </label>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default AdminProductEdit;
