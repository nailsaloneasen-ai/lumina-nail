import { useAuth } from '../contexts/AuthContext';

interface AppHeaderProps {
  title: string;
}

/**
 * 各画面上部に表示する共通ヘッダー。
 * ログイン中のユーザー名とログアウトボタンを表示する。
 */
export default function AppHeader({ title }: AppHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="brand-gradient px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5 rounded-b-3xl shadow-lg shadow-lumina-wisteria/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-white/70 font-medium">
            S'ARGENT
          </p>
          <h1
            className="text-2xl text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-white/80">{user?.displayName}</span>
          <button
            type="button"
            onClick={() => logout()}
            aria-label="ログアウト"
            className="rounded-full bg-white/15 px-3 py-1.5 text-xs text-white
                       active:bg-white/25 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
