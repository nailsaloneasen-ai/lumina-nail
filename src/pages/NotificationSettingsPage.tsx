import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { getNotificationSettings, setStaffEmail } from '../lib/settings';

/**
 * 予約通知メールの設定画面(オーナー専用)
 * -----------------------------------------------------------------------
 * 新規予約が入ったときにメールを送るスタッフの宛先を登録・変更する。
 * 送信自体はGoogle Apps Script経由(src/lib/notify.ts)で行われ、
 * ここではその宛先(staffEmail)をFirestoreに保存するのみ。
 * -----------------------------------------------------------------------
 */
export default function NotificationSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'owner') return;
    getNotificationSettings()
      .then((settings) => setEmail(settings.staffEmail))
      .catch(() => setErrorMessage('設定の読み込みに失敗しました'))
      .finally(() => setIsLoading(false));
  }, [user]);

  if (user?.role !== 'owner') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-sm text-ink-soft">この画面はオーナーのみ利用できます</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm text-lumina-wisteria"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = email.trim();
    if (trimmed && !trimmed.includes('@')) {
      setErrorMessage('正しいメールアドレスを入力してください');
      return;
    }

    setIsSaving(true);
    try {
      await setStaffEmail(trimmed);
      setEmail(trimmed);
      setSuccessMessage(trimmed ? '通知先を保存しました' : '通知先を削除しました(通知は送られません)');
    } catch {
      setErrorMessage('保存に失敗しました。もう一度お試しください');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-dvh pb-16">
      <AppHeader title="予約通知の設定" />

      <main className="px-5 -mt-2 pt-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="text-sm text-lumina-wisteria"
        >
          ← 設定に戻る
        </button>

        <form onSubmit={handleSubmit} className="glass-card p-5 space-y-4" noValidate>
          <div>
            <label htmlFor="staffEmail" className="block text-sm text-ink-soft mb-1.5">
              通知先メールアドレス(スタッフ)
            </label>
            <input
              id="staffEmail"
              type="email"
              autoComplete="off"
              inputMode="email"
              placeholder="staff@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                         text-base text-ink outline-none focus:border-lumina-pink-deep
                         focus:ring-2 focus:ring-lumina-pink/40 disabled:opacity-60"
            />
            <p className="text-xs text-ink-soft mt-2">
              新しい予約が保存されたときに、このアドレス宛に通知メールが届きます
              (オーナーにも自動でCcされます)。空欄のままにすると通知は送られません。
            </p>
          </div>

          {errorMessage && (
            <p className="text-sm text-lumina-pink-deep bg-lumina-cream rounded-lg px-3 py-2">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="text-sm text-status-paid bg-white/70 rounded-lg px-3 py-2">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="w-full brand-gradient rounded-xl py-3.5 text-white font-medium
                       shadow-lg shadow-lumina-wisteria/20 disabled:opacity-60
                       transition-opacity active:opacity-90"
          >
            {isSaving ? '保存中…' : '保存する'}
          </button>
        </form>
      </main>
    </div>
  );
}
