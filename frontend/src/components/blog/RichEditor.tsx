import React, { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import CharacterCount from "@tiptap/extension-character-count";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { adminUploadImage } from "../../lib/blog-api";
import BrandSelect from "../admin/BrandSelect";
import styles from "./RichEditor.module.css";

declare const process: { env: Record<string, string | undefined> };

/* =====================================================================
   RichEditor — TipTap-базований WYSIWYG редактор для адмінки блогу.
   Підтримує: bold/italic/underline/strike, H1-H3, lists, blockquote, code,
   link, image (з завантаженням файлу), YouTube embed, text align,
   color, undo/redo, clear formatting.
   Базовий шрифт виведеного контенту — Golos Text (як по дизайну
   сайту). Адмін може змінювати лише колір окремих фрагментів.
   ===================================================================== */

export type RichEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
};

const RichEditor: React.FC<RichEditorProps> = ({
  value,
  onChange,
  placeholder = "Почніть писати вашу статтю…",
  minHeight = 400,
  className = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        codeBlock: { HTMLAttributes: { class: styles.codeBlock } },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto", "tel"],
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({
        allowBase64: false,
        inline: false,
        HTMLAttributes: { class: styles.embeddedImage },
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        width: 720,
        height: 405,
        HTMLAttributes: { class: styles.embeddedYoutube },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      FontFamily.configure({ types: ["textStyle"] }),
      CharacterCount.configure({ limit: null }),
      Table.configure({ resizable: true, HTMLAttributes: { class: styles.embeddedTable } }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: styles.editorContent,
        style: `min-height:${minHeight}px;`,
      },
    },
  });

  // Keep editor in sync if outer value changes (e.g. when loading existing post)
  useEffect(() => {
    if (!editor) return;
    if (value && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  const handleAddLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Адреса посилання (https://…):", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    let safe = url.trim();
    if (!/^(https?:|mailto:|tel:|\/)/i.test(safe)) safe = `https://${safe}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: safe }).run();
  }, [editor]);

  const handleAddYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt(
      "Вставити відео з YouTube. Вкажіть URL (https://www.youtube.com/watch?v=…):",
      "https://www.youtube.com/watch?v="
    );
    if (!url) return;
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
  }, [editor]);

  const handlePickImage = useCallback(() => fileInputRef.current?.click(), []);

  const uploadAndInsertImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      try {
        const { url } = await adminUploadImage(file);
        const fullUrl = url.startsWith("http")
          ? url
          : `${process.env.REACT_APP_BACKEND_URL || ""}${url}`;
        editor.chain().focus().setImage({ src: fullUrl, alt: file.name }).run();
      } catch (err: any) {
        window.alert(
          err?.response?.data?.detail ||
            "Не вдалося завантажити зображення. Перевірте розмір (<10MB) та формат (JPG/PNG/WEBP/SVG/GIF)."
        );
      }
    },
    [editor]
  );

  const handleImageFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // reset so user can pick same file again
      if (!file) return;
      await uploadAndInsertImage(file);
    },
    [uploadAndInsertImage]
  );

  // Paste / drop image from clipboard or filesystem → upload + embed
  useEffect(() => {
    if (!editor) return;
    let dom: HTMLElement | null = null;
    try {
      // editor.view may not yet be ready on the very first render — guard it.
      dom = editor.view?.dom as HTMLElement | undefined ?? null;
    } catch {
      dom = null;
    }
    if (!dom) return;

    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            await uploadAndInsertImage(file);
            return;
          }
        }
      }
    };
    const onDrop = async (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (imgs.length === 0) return;
      e.preventDefault();
      for (const f of imgs) await uploadAndInsertImage(f);
    };
    dom.addEventListener("paste", onPaste);
    dom.addEventListener("drop", onDrop);
    return () => {
      dom?.removeEventListener("paste", onPaste);
      dom?.removeEventListener("drop", onDrop);
    };
  }, [editor, uploadAndInsertImage]);

  if (!editor) return <div className={styles.shellLoading}>Завантаження редактора…</div>;

  // Safely read character/word counts — TipTap throws if view is not yet mounted (StrictMode double-render).
  let words = 0;
  let chars = 0;
  try {
    const cc = (editor.storage as any).characterCount;
    if (cc && editor.view) {
      words = cc.words?.() ?? 0;
      chars = cc.characters?.() ?? 0;
    }
  } catch {
    /* not yet ready */
  }
  const readMinutes = Math.max(1, Math.round((words || 0) / 220));

  const btn = (active: boolean, extra = "") =>
    [styles.tbBtn, active ? styles.tbBtnActive : "", extra].filter(Boolean).join(" ");

  return (
    <div className={[styles.shell, className].filter(Boolean).join(" ")} data-testid="rich-editor">
      <div className={styles.toolbar} role="toolbar">
        {/* History */}
        <button type="button" className={btn(false)} onClick={() => editor.chain().focus().undo().run()} title="Скасувати (Ctrl+Z)">
          ↶
        </button>
        <button type="button" className={btn(false)} onClick={() => editor.chain().focus().redo().run()} title="Повторити (Ctrl+Y)">
          ↷
        </button>
        <span className={styles.tbSep} />

        {/* Headings + paragraph */}
        <BrandSelect
          size="sm"
          minWidth={130}
          ariaLabel="Заголовок або абзац"
          value={
            editor.isActive("heading", { level: 1 })
              ? "h1"
              : editor.isActive("heading", { level: 2 })
              ? "h2"
              : editor.isActive("heading", { level: 3 })
              ? "h3"
              : "p"
          }
          onChange={(v) => {
            if (v === "p") editor.chain().focus().setParagraph().run();
            else
              editor
                .chain()
                .focus()
                .toggleHeading({ level: Number(v.replace("h", "")) as 1 | 2 | 3 })
                .run();
          }}
          options={[
            { value: "p", label: "Абзац" },
            { value: "h1", label: "Заголовок 1" },
            { value: "h2", label: "Заголовок 2" },
            { value: "h3", label: "Заголовок 3" },
          ]}
        />

        {/* Font family */}
        <BrandSelect
          size="sm"
          minWidth={170}
          ariaLabel="Шрифт"
          value={(editor.getAttributes("textStyle").fontFamily as string) || ""}
          onChange={(v) => {
            if (!v) editor.chain().focus().unsetFontFamily().run();
            else editor.chain().focus().setFontFamily(v).run();
          }}
          options={[
            { value: "", label: "Базовий (Golos Text)" },
            { value: '"Commissioner", system-ui, sans-serif', label: "Commissioner (заголовки)" },
            { value: '"Inter", system-ui, sans-serif', label: "Inter" },
            { value: '"Golos Text", system-ui, sans-serif', label: "Golos Text" },
            { value: '"JetBrains Mono", ui-monospace, monospace', label: "Mono" },
          ]}
        />
        <span className={styles.tbSep} />

        {/* Inline marks */}
        <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Жирний (Ctrl+B)">
          <strong>B</strong>
        </button>
        <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Курсив (Ctrl+I)">
          <em>I</em>
        </button>
        <button type="button" className={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Підкреслення (Ctrl+U)">
          <u>U</u>
        </button>
        <button type="button" className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Перекреслення">
          <s>S</s>
        </button>
        <button type="button" className={btn(editor.isActive("code"))} onClick={() => editor.chain().focus().toggleCode().run()} title="Код в рядку">
          {`<>`}
        </button>
        <input
          type="color"
          className={styles.tbColor}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          value={(editor.getAttributes("textStyle").color as string) || "#2c2c27"}
          title="Колір тексту"
        />
        <button
          type="button"
          className={btn(false)}
          onClick={() => editor.chain().focus().unsetColor().run()}
          title="Скинути колір"
        >
          ✕A
        </button>
        <span className={styles.tbSep} />

        {/* Lists & blockquote */}
        <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Список маркований">
          • —
        </button>
        <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Список нумерований">
          1. —
        </button>
        <button type="button" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Цитата">
          ”
        </button>
        <button type="button" className={btn(editor.isActive("codeBlock"))} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Блок коду">
          {`{ }`}
        </button>
        <span className={styles.tbSep} />

        {/* Align */}
        <button type="button" className={btn(editor.isActive({ textAlign: "left" }))} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="По лівому краю">≡←</button>
        <button type="button" className={btn(editor.isActive({ textAlign: "center" }))} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="По центру">≡</button>
        <button type="button" className={btn(editor.isActive({ textAlign: "right" }))} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="По правому краю">≡→</button>
        <button type="button" className={btn(editor.isActive({ textAlign: "justify" }))} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="По ширині">≡≡</button>
        <span className={styles.tbSep} />

        {/* Media & link */}
        <button type="button" className={btn(editor.isActive("link"))} onClick={handleAddLink} title="Додати посилання">
          🔗
        </button>
        <button type="button" className={btn(false)} onClick={handlePickImage} title="Додати зображення" data-testid="editor-add-image">
          🖼
        </button>
        <button type="button" className={btn(false)} onClick={handleAddYoutube} title="Додати YouTube відео">
          ▶ YT
        </button>
        <button
          type="button"
          className={btn(false)}
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title="Вставити таблицю 3×3"
          data-testid="editor-insert-table"
        >
          ⊞
        </button>
        <button
          type="button"
          className={btn(false)}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Горизонтальна лінія"
        >
          —
        </button>
        <span className={styles.tbSep} />

        {/* Table sub-actions — appear only when caret is in table */}
        {editor.isActive("table") && (
          <>
            <button type="button" className={styles.tbBtn} onClick={() => editor.chain().focus().addRowAfter().run()} title="+ Рядок">+R</button>
            <button type="button" className={styles.tbBtn} onClick={() => editor.chain().focus().addColumnAfter().run()} title="+ Колонка">+C</button>
            <button type="button" className={styles.tbBtn} onClick={() => editor.chain().focus().deleteRow().run()} title="− Рядок">−R</button>
            <button type="button" className={styles.tbBtn} onClick={() => editor.chain().focus().deleteColumn().run()} title="− Колонка">−C</button>
            <button type="button" className={styles.tbBtn} onClick={() => editor.chain().focus().deleteTable().run()} title="Видалити таблицю">×T</button>
            <span className={styles.tbSep} />
          </>
        )}

        {/* Clear */}
        <button
          type="button"
          className={btn(false)}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Очистити форматування"
        >
          ✕¶
        </button>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          ref={fileInputRef}
          className={styles.hiddenInput}
          onChange={handleImageFile}
        />
      </div>

      <EditorContent editor={editor} />

      <div className={styles.statusBar}>
        <span>Слів: {words}</span>
        <span>≈ {readMinutes} хв читання</span>
        <span>{chars} символів</span>
      </div>
    </div>
  );
};

export default RichEditor;
export type { Editor };
