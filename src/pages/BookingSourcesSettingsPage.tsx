import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { getBookingSources, setBookingSources } from '../lib/bookingSources';

/**
 * 予約媒体(ホットペッパー・ミニモ・ネイリーなど)の選択肢を管理する画面(オーナー専用)。
 * 予約フォームのプルダウンに出す項目を、ここから自由に追加・削除できる。
 */
export default function BookingSourcesSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sources, setSources] = useState<string[]>([]);
  const [newSource, setNewSource] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'owner') return;
    getBookingSources()
      .then(setSources)
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

  async function persist(next: string[]) {
    setErrorMessage(null);
    setIsSaving(true);
    try {
      await setBookingSources(next);
      setSources(next);
    } catch {
      setErrorMessage('保存に失敗しました。もう一度お試しください');
    } finally {
      setIsSaving(false);
    }
  }

  function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = newSource.trim();
    if (!trimmed) return;
    if (sources.includes(trimmed)) {
      setErrorMessage('同じ名前の予約媒体が既にあります');
      return;
    }
    void persist([...sources, trimmed]);
    setNewSource('');
  }

  function handleRemove(source: string) {
    void persist(sources.filter((s) => s !== source));
  }

  return (
    <div className="min-h-dvh pb-16">
      <AppHeader title="予約媒体の管理" />

      <main className="px-5 -mt-2 pt-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="text-sm text-lumina-wisteria"
        >
          ← 設定に戻る
        </button>

        <div className="glass-card p-5 space-y-3">
          <p className="text-sm text-ink-soft">
            ここで追加した項目が、予約登録画面の「予約媒体」のプルダウンに表示されます。
          </p>

          {isLoading ? (
            <p className="text-sm text-ink-soft py-4 text-center">読み込み中…</p>
          ) : (
            <ul className="space-y-2">
              {sources.map((source) => (
                <li
                  key={source}
                  className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3"
                >
                  <span className="text-sm text-ink">{source}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(source)}
                    disabled={isSaving}
                    className="text-xs text-lumina-pink-deep active:opacity-60 disabled:opacity-40"
                  >
                    削除
                  </button>
                </li>
              ))}
              {sources.length === 0 && (
                <p className="text-sm text-ink-soft py-4 text-center">
                  予約媒体が登録されていません
                </p>
              )}
            </ul>
          )}

          {errorMessage && (
            <p className="text-sm text-lumina-pink-deep bg-lumina-cream rounded-lg px-3 py-2">
              {errorMessage}
            </p>
          )}

          <form onSubmit={handleAdd} className="flex gap-2 pt-2">
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="新しい予約媒体名"
              disabled={isSaving || isLoading}
              className="flex-1 rounded-xl border border-lumina-blush bg-white/80 px-4 py-2.5
                         text-sm text-ink outline-none focus:border-lumina-pink-deep
                         focus:ring-2 focus:ring-lumina-pink/40 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isSaving || isLoading || !newSource.trim()}
              className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium text-white
                         brand-gradient disabled:opacity-40 transition-opacity active:opacity-90"
            >
              追加
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
