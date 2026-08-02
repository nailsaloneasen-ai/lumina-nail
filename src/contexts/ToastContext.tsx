import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ToastOptions {
  /** 「元に戻す」のようなアクションボタンのラベル。指定しない場合は表示しない。 */
  actionLabel?: string;
  onAction?: () => void;
  /** 表示時間(ミリ秒)。デフォルト2800ms。 */
  durationMs?: number;
}

interface ToastState {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION_MS = 2800;

/**
 * 全画面共通のトースト通知。
 * ・保存成功時などの「できた感」のフィードバック(例: 「保存しました」)
 * ・削除操作の「元に戻す」ボタン付き通知(スナックバー)
 * の両方をこの仕組みでまかなう。
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    idRef.current += 1;
    const id = idRef.current;
    setToast({
      id,
      message,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
    });

    timerRef.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, options?.durationMs ?? DEFAULT_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {toast && (
        <div
          className="no-print fixed left-4 right-4 bottom-40 z-[60] flex justify-center pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div
            className="pointer-events-auto max-w-sm w-full bg-ink text-white rounded-2xl
                       shadow-xl px-4 py-3 flex items-center justify-between gap-3 toast-enter"
          >
            <p className="text-sm">{toast.message}</p>
            {toast.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                  if (timerRef.current) clearTimeout(timerRef.current);
                }}
                className="shrink-0 text-sm font-medium text-lumina-gold active:opacity-70
                           transition-opacity"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

/** トースト通知を表示するためのフック。ToastProviderの内側でのみ使用可能。 */
// eslint-disable-next-line react-refresh/only-export-components -- Provider定義と同一ファイルに置く一般的なパターン
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastはToastProviderの内側で使用してください');
  }
  return context;
}
