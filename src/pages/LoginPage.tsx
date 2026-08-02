import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * ログイン画面
 * -----------------------------------------------------------------------
 * 固定の2ユーザー(オーナー/従業員)のみが対象。IDとパスワードを入力して
 * ログインする。バリデーションエラーは画面下部にまとめて表示する。
 * -----------------------------------------------------------------------
 */
export default function LoginPage() {
  const { login } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!loginId.trim() || !password) {
      setErrorMessage('IDとパスワードを入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(loginId, password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'ログインに失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="glass-card w-full max-w-sm p-8">
        {/* ブランドヘッダー */}
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.3em] text-lumina-wisteria font-medium mb-2">
            S'ARGENT
          </p>
          <h1 className="text-3xl text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            ログイン
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="loginId" className="block text-sm text-ink-soft mb-1.5">
              ID
            </label>
            <input
              id="loginId"
              type="text"
              inputMode="text"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                         text-base text-ink outline-none transition-colors
                         focus:border-lumina-pink-deep focus:ring-2 focus:ring-lumina-pink/40"
              placeholder="owner"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-ink-soft mb-1.5">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                         text-base text-ink outline-none transition-colors
                         focus:border-lumina-pink-deep focus:ring-2 focus:ring-lumina-pink/40"
              placeholder="••••••••"
            />
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="text-sm text-lumina-pink-deep bg-lumina-cream rounded-lg px-3 py-2"
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="brand-gradient w-full rounded-xl py-3.5 text-white font-medium
                       shadow-lg shadow-lumina-wisteria/20 transition-opacity
                       disabled:opacity-60 active:opacity-90"
          >
            {isSubmitting ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}
