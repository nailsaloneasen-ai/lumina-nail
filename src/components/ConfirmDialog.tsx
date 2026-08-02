interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** true(危険な操作)の場合、確定ボタンを警告色にする */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 汎用の確認ダイアログ。
 * 重複予約の確認、削除確認など「はい/いいえ」で分岐する操作全般に使う。
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-ink/30 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="glass-card w-full max-w-sm p-6 bg-white/95">
        <h2 id="confirm-dialog-title" className="text-lg text-ink font-medium mb-2">
          {title}
        </h2>
        <p className="text-sm text-ink-soft leading-relaxed mb-6 whitespace-pre-line">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl py-3 text-sm font-medium text-ink-soft
                       border border-lumina-blush transition-[background-color,transform]
                       active:bg-lumina-blush/40 active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-3 text-sm font-medium text-white transition-[opacity,transform] active:opacity-90 active:scale-95 ${
              danger ? 'bg-lumina-pink-deep' : 'brand-gradient'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
