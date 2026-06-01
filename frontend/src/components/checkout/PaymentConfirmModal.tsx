import React, { useState } from "react";
import ReactDOM from "react-dom";
import styles from "./PaymentConfirmModal.module.css";

/* =====================================================================
   PaymentConfirmModal — єдиний multi-step потік оплати «За реквізитами»:
     Step 1: Реквізити — користувач бачить IBAN/ЄДРПОУ/банк, кнопка «Я оплатив»
     Step 2: Підтвердження оплати — завантажити квитанцію АБО ввести номер
             транзакції (одне з двох обов'язкове)
     Step 3: Готово — підтвердження, «Менеджер зв'яжеться» → onFinalConfirm()

   Нафайл роблять бекендом пізніше (поки просто тримаються в пам'яті
   після запиту — буде POST /api/orders з multipart наступним кроком).
   ===================================================================== */

export type PaymentRequisites = {
  recipient: string;
  edrpou: string;
  iban: string;
  bank: string;
  purpose: string;
};

export const DEFAULT_REQUISITES: PaymentRequisites = {
  recipient: "ТОВ «ТОРГОВИЙ ДІМ ТАМІС АГРО»",
  edrpou: "12345678",
  iban: "UA00 0000 0000 0000 0000 0000 000",
  bank: "АТ КБ «ПриватБанк»",
  purpose: "Оплата за товар згідно замовлення",
};

type Props = {
  open: boolean;
  amount: number;
  requisites?: PaymentRequisites;
  onClose: () => void;
  onFinalConfirm: (payload: { transactionId: string; receiptName: string | null }) => void;
};

const fmt = (n: number) => n.toLocaleString("uk-UA");

const PaymentConfirmModal: React.FC<Props> = ({
  open, amount, requisites = DEFAULT_REQUISITES, onClose, onFinalConfirm,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [txId, setTxId] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setTxId("");
      setReceipt(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* noop */ }
  };

  const confirmPayment = () => {
    if (!txId.trim() && !receipt) {
      setError("Додайте квитанцію або номер транзакції (хоча б одне).");
      return;
    }
    setError(null);
    setStep(3);
  };

  return ReactDOM.createPortal(
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" data-testid="payment-modal">
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрити">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="#2C2C27" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>

        {/* ===== Stepper ===== */}
        <ol className={styles.stepper} aria-label="Кроки оплати">
          {[
            { n: 1, label: "Реквізити" },
            { n: 2, label: "Підтвердження" },
            { n: 3, label: "Готово" },
          ].map((s, i, arr) => (
            <li key={s.n} className={`${styles.step} ${step >= (s.n as 1 | 2 | 3) ? styles.stepActive : ""} ${step === s.n ? styles.stepCurrent : ""}`}>
              <span className={styles.stepDot}>{step > s.n ? "✓" : s.n}</span>
              <span className={styles.stepLabel}>{s.label}</span>
              {i < arr.length - 1 && <span className={styles.stepLine} aria-hidden="true" />}
            </li>
          ))}
        </ol>

        {/* ===== STEP 1: Requisites ===== */}
        {step === 1 && (
          <>
            <h2 className={styles.title}>Реквізити для оплати</h2>
            <p className={styles.lead}>Сплатіть <strong>{fmt(amount)} ₴</strong> банківським переказом за реквізитами нижче. Після оплати натисніть <em>«Я оплатив»</em>.</p>

            <ul className={styles.reqList}>
              <RequisiteRow label="Одержувач" value={requisites.recipient} onCopy={copyToClipboard} />
              <RequisiteRow label="ЄДРПОУ" value={requisites.edrpou} onCopy={copyToClipboard} mono />
              <RequisiteRow label="IBAN" value={requisites.iban} onCopy={copyToClipboard} mono />
              <RequisiteRow label="Банк" value={requisites.bank} onCopy={copyToClipboard} />
              <RequisiteRow label="Призначення" value={requisites.purpose} onCopy={copyToClipboard} />
              <RequisiteRow label="Сума" value={`${fmt(amount)} ₴`} onCopy={copyToClipboard} highlight />
            </ul>

            <p className={styles.hint}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="8" stroke="#1b4332" strokeWidth="1.5"/>
                <path d="M10 6v5M10 14h.01" stroke="#1b4332" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Рахунок-фактуру ми надішлемо на вашу пошту після підтвердження оплати.
            </p>

            <div className={styles.actions}>
              <button type="button" className={styles.btnGhost} onClick={onClose} data-testid="payment-cancel">Скасувати</button>
              <button type="button" className={styles.btnPrimary} onClick={() => setStep(2)} data-testid="payment-i-paid">Я оплатив</button>
            </div>
          </>
        )}

        {/* ===== STEP 2: Confirmation form ===== */}
        {step === 2 && (
          <>
            <h2 className={styles.title}>Підтвердити оплату</h2>
            <p className={styles.lead}>Щоб менеджер одразу перевірив вашу оплату — додайте квитанцію або номер транзакції.</p>

            <div className={styles.formBlock}>
              <label className={styles.fieldLabel}>Номер / референс транзакції</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Наприклад, REF-2024-001234"
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                data-testid="payment-tx-id"
              />
              <p className={styles.fieldHint}>Или зкопіюйте номер платежу з вашого банку.</p>
            </div>

            <div className={styles.divider}><span>або</span></div>

            <div className={styles.formBlock}>
              <label className={styles.fieldLabel}>Скрін / квитанція (PDF, JPG, PNG)</label>
              <div className={`${styles.dropzone} ${receipt ? styles.dropzoneFilled : ""}`}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,image/*,application/pdf"
                  className={styles.fileInput}
                  onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                  data-testid="payment-receipt"
                />
                <div className={styles.dropzoneText}>
                  {receipt ? (
                    <>
                      <span className={styles.fileBadge}>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 4a1 1 0 011-1h6l4 4v9a1 1 0 01-1 1H6a1 1 0 01-1-1V4z" stroke="#1b4332" strokeWidth="1.5"/><path d="M12 3v4h4" stroke="#1b4332" strokeWidth="1.5"/></svg>
                        {receipt.name}
                      </span>
                      <button type="button" className={styles.fileRemove} onClick={() => setReceipt(null)}>Видалити</button>
                    </>
                  ) : (
                    <>
                      <strong>Перетягніть файл сюди</strong>
                      <span>або натисніть, щоб вибрати (до 5 MB)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {error && <div className={styles.error} data-testid="payment-error">{error}</div>}

            <div className={styles.actions}>
              <button type="button" className={styles.btnGhost} onClick={() => setStep(1)}>Назад</button>
              <button type="button" className={styles.btnPrimary} onClick={confirmPayment} data-testid="payment-confirm">
                Підтвердити оплату
              </button>
            </div>
          </>
        )}

        {/* ===== STEP 3: Success ===== */}
        {step === 3 && (
          <>
            <div className={styles.successIcon} aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="28" fill="#e7ebe7" stroke="#1b4332" strokeWidth="2"/>
                <path d="M18 30L26 38L42 22" stroke="#1b4332" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className={styles.title} style={{ textAlign: "center" }}>Оплату підтверджено</h2>
            <p className={styles.lead} style={{ textAlign: "center" }}>
              Дякуємо! Ми отримали ваше підтвердження.<br/>
              Менеджер зв'яжеться з вами найближчим часом для уточнення деталей доставки.
            </p>
            <div className={styles.successBox}>
              <div><span>Сума:</span> <strong>{fmt(amount)} ₴</strong></div>
              {txId && <div><span>Номер транзакції:</span> <strong>{txId}</strong></div>}
              {receipt && <div><span>Квитанція:</span> <strong>{receipt.name}</strong></div>}
              <div><span>Статус:</span> <strong style={{ color: "#1b4332" }}>Очікує перевірки</strong></div>
            </div>
            <div className={styles.actions} style={{ justifyContent: "center" }}>
              <button type="button" className={styles.btnPrimary} onClick={() => onFinalConfirm({ transactionId: txId.trim(), receiptName: receipt?.name || null })} data-testid="payment-done">
                До головної
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

const RequisiteRow: React.FC<{
  label: string; value: string; onCopy: (v: string) => void; mono?: boolean; highlight?: boolean;
}> = ({ label, value, onCopy, mono, highlight }) => (
  <li className={`${styles.reqRow} ${highlight ? styles.reqRowHighlight : ""}`}>
    <span className={styles.reqLabel}>{label}</span>
    <span className={`${styles.reqValue} ${mono ? styles.reqValueMono : ""}`}>{value}</span>
    <button type="button" className={styles.reqCopy} onClick={() => onCopy(value)} aria-label="Скопіювати">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><rect x="6" y="6" width="11" height="11" rx="2" stroke="#2C2C27" strokeWidth="1.5"/><path d="M14 6V4a1 1 0 00-1-1H4a1 1 0 00-1 1v9a1 1 0 001 1h2" stroke="#2C2C27" strokeWidth="1.5"/></svg>
    </button>
  </li>
);

export default PaymentConfirmModal;
