import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { changeOwnPassword } from '../lib/passwordChange';

/**
 * パスワード変更画面(オーナー専用・ログイン中のアカウント自身のみ変更可能)
 * 他アカウントのパスワードリセットが必要な場合はFirebase Consoleから行う
 * (README「パスワード変更について」参照)。
 */
export default function PasswordChangePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('すべての項目を入力してください');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('新しいパスワードは6文字以上で入力してください');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('新しいパスワードが一致しません');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setErrorMessage('ログイン状態を確認できませんでした。再ログインしてください');
      return;
    }

    setIsSaving(true);
    try {
      await changeOwnPassword(currentUser, currentPassword, newPassword);
      setSuccessMessage('パスワードを変更しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setErrorMessage('現在のパスワードが正しくないか、変更に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-dvh pb-16">
      <AppHeader title="パスワード変更" />

      <main className="px-5 -mt-2 pt-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="text-sm text-lumina-wisteria"
        >
          ← 設定に戻る
        </button>

        <form onSubmit={handleSubmit} className="glass-card p-5 space-y-4" noValidate>
          <PasswordField
            id="currentPassword"
            label="現在のパスワード"
            value={currentPassword}
            onChange={setCurrentPassword}
          />
          <PasswordField
            id="newPassword"
            label="新しいパスワード(6文字以上)"
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordField
            id="confirmPassword"
            label="新しいパスワード(確認)"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />

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
            disabled={isSaving}
            className="w-full brand-gradient rounded-xl py-3.5 text-white font-medium
                       shadow-lg shadow-lumina-wisteria/20 disabled:opacity-60
                       transition-opacity active:opacity-90"
          >
            {isSaving ? '変更中…' : '変更する'}
          </button>
        </form>

        <p className="text-xs text-ink-soft text-center px-4">
          ※もう一方のアカウントのパスワードを変更したい場合は、Firebase Consoleから
          手動で行う必要があります(詳細はREADMEを参照)
        </p>
      </main>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-ink-soft mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                   text-base text-ink outline-none focus:border-lumina-pink-deep
                   focus:ring-2 focus:ring-lumina-pink/40"
      />
    </div>
  );
}
