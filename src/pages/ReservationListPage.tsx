import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeReservationsByDate } from '../lib/reservations';
import { formatDateJP } from '../utils/format';
import { useEffect, useState } from 'react';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import ReservationListItem from '../components/ReservationListItem';
import { ReservationListSkeleton } from '../components/Skeleton';
import type { Reservation } from '../types';

/**
 * 日別の予約一覧画面。
 * カレンダーの日付タップ、またはホーム画面から遷移してくる。
 *
 * - 予約追加はオーナーのみ(右上の「+ 新規予約」ボタン)
 * - 予約タップで詳細画面へ遷移(閲覧は全員可能)
 */
export default function ReservationListPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isOwner = user?.role === 'owner';

  useEffect(() => {
    if (!date) return;
    const unsubscribe = subscribeReservationsByDate(date, (data) => {
      setReservations(data);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [date]);

  if (!date) return null;

  return (
    <div className="min-h-dvh pb-24">
      <AppHeader title="予約一覧" />

      <main className="px-5 -mt-2 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="text-sm text-lumina-wisteria"
          >
            ← カレンダーに戻る
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => navigate(`/reservations/${date}/new`)}
              className="text-sm font-medium text-white brand-gradient rounded-full px-4 py-2
                         transition-transform active:scale-95"
            >
              + 新規予約
            </button>
          )}
        </div>

        <p className="text-sm text-ink-soft">{formatDateJP(date)}</p>

        <div className="glass-card p-5">
          {isLoading && <ReservationListSkeleton />}

          {!isLoading && reservations.length === 0 && (
            <p className="text-sm text-ink-soft py-6 text-center">
              この日の予約はありません
            </p>
          )}

          {!isLoading && reservations.length > 0 && (
            <div className="space-y-2">
              {reservations.map((reservation) => (
                <ReservationListItem
                  key={reservation.id}
                  reservation={reservation}
                  onClick={(r) => navigate(`/reservation/${r.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
