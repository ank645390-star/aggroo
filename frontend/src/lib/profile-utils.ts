/**
 * Спільні утиліти для сторінок профілю / адрес:
 *   • безпечний localStorage-обгортувач (працює в SSR і за вимкненого storage)
 *   • валідація українського телефону та автоматичне форматування
 *   • валідація email
 *
 * Усе працює виключно на клієнті — без бекенду.
 */

/* ----------------------- localStorage helpers ----------------------- */
export function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLS<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — ignore */
  }
}

/* ----------------------- phone (UA) ------------------------ */
/**
 * Нормалізує будь-який введений номер до 12 цифр у форматі 380XXXXXXXXX.
 * Повертає null, якщо номер не підходить (некоректний український).
 */
export function normalizeUaPhone(input: string): string | null {
  const digits = (input || "").replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("380") && n.length === 12) return n;
  if (n.startsWith("80") && n.length === 11) return "3" + n;
  if (n.startsWith("0") && n.length === 10) return "38" + n;
  // dial-in mobile / landline without leading 0 (10 digits): 50XXXXXXXX
  if (n.length === 9) return "380" + n;
  return null;
}

/**
 * Форматує 12-значний нормалізований номер (380XXXXXXXXX)
 * у вигляді "+380 (XX) XXX XX XX".
 */
export function formatUaPhone(digits12: string): string {
  if (!digits12 || digits12.length !== 12) return digits12;
  return (
    "+" +
    digits12.slice(0, 3) +
    " (" +
    digits12.slice(3, 5) +
    ") " +
    digits12.slice(5, 8) +
    " " +
    digits12.slice(8, 10) +
    " " +
    digits12.slice(10, 12)
  );
}

export function isValidUaPhone(input: string): boolean {
  return normalizeUaPhone(input) !== null;
}

/**
 * Маска для live-input: дозволяє користувачу друкувати в довільному форматі,
 * але показує його як "+380 (XX) XXX XX XX" в міру набору.
 */
export function progressiveFormatUaPhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  // Беремо тільки до 12 цифр у форматі 380...
  let core = digits;
  if (core.startsWith("38")) core = core.slice(2);
  if (core.startsWith("0")) core = core.slice(1);
  core = core.slice(0, 9); // максимум 9 цифр оператора+номеру

  if (core.length === 0) return "";
  let out = "+380";
  if (core.length >= 1) out += " (" + core.slice(0, 2);
  if (core.length >= 2) out += ")";
  if (core.length >= 3) out += " " + core.slice(2, 5);
  if (core.length >= 6) out += " " + core.slice(5, 7);
  if (core.length >= 8) out += " " + core.slice(7, 9);
  return out;
}

/* ----------------------- email ----------------------- */
export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
}

/* ----------------------- zip (UA - 5 digits) ----------------------- */
export function isValidUaZip(v: string): boolean {
  return /^\d{5}$/.test((v || "").trim());
}
