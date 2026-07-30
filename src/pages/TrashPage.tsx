import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  daysSinceDeleted,
  purgeExpiredTrash,
  restoreReservation,
  subscribeTrashedReservations,
} from '../lib/trash';
import { formatDateJP } from '../utils/format';
import type { Reservation } from '../types';

const RETENTION_DAYS = 30;

/**
 * ゴミ箱画面(オーナー専用)
 * -----------------------------------------------------------------------
 * 論理削除された予約の一覧を表示し、復元操作を提供する。
 * 画面を開いたタイミングで、削除から30日以上経過した予約を
 * バックグラウンドで完全削除する(サーバーレス構成のための遅延クリーンアップ)。
 * -----------------------------------------------------------------------
 */
export default function TrashPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'owner') return;

    // 期限切れ(30日経過)の予約をバックグラウンドで完全削除する
    void purgeExpiredTrash();

    const unsubscribe = subscribeTrashedReservations((data) => {
      setReservations(data);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [user]);

  if (user?.role !== 'owner') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-sm text-ink-soft">この画面はオーナーのみ閲覧できます</p>
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

  async function handleRestore(id: string) {
    if (!user) return;
    setRestoringId(id);
    try {
      await restoreReservation(id, user.uid);
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="min-h-dvh pb-16">
      <AppHeader title="ゴミ箱" />

      <main className="px-5 -mt-2 pt-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="text-sm text-lumina-wisteria"
        >
          ← 設定に戻る
        </button>

        <p className="text-xs text-ink-soft">
          削除した予約は30日間ここに保管され、その後自動的に完全削除されます。
        </p>

        <div className="glass-card p-5">
          {isLoading && (
            <p className="text-sm text-ink-soft py-6 text-center">読み込み中…</p>
          )}

          {!isLoading && reservations.length === 0 && (
            <p className="text-sm text-ink-soft py-6 text-center">ゴミ箱は空です</p>
          )}

          {!isLoading && reservations.length > 0 && (
            <div className="space-y-3">
              {reservations.map((reservation) => {
                const elapsed = reservation.deletedAt
                  ? daysSinceDeleted(reservation.deletedAt)
                  : 0;
                const remaining = Math.max(RETENTION_DAYS - elapsed, 0);

                return (
                  <div
                    key={reservation.id}
                    className="rounded-xl bg-white/70 px-4 py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {reservation.customerName}
                      </p>
                      <p className="text-xs text-ink-soft truncate">
                        {formatDateJP(reservation.date)} {reservation.startTime}
                      </p>
                      <p className="text-[11px] text-lumina-pink-deep mt-0.5">
                        あと{remaining}日で完全削除
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={restoringId === reservation.id || !isOnline}
                      onClick={() => void handleRestore(reservation.id)}
                      className="shrink-0 rounded-full px-4 py-2 text-xs font-medium text-white
                                 brand-gradient disabled:opacity-60"
                    >
                      {restoringId === reservation.id ? '復元中…' : '復元'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
