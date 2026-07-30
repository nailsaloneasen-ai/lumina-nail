import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTodayReservations } from '../hooks/useTodayReservations';
import { sumTodayRevenue } from '../lib/reservations';
import { formatCurrency, formatDateJP, todayDateString } from '../utils/format';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import ReservationListItem from '../components/ReservationListItem';

/**
 * ホーム画面
 * -----------------------------------------------------------------------
 * ・今日の予約一覧(全ユーザー閲覧可)
 * ・今日の売上(オーナーのみ表示)
 * -----------------------------------------------------------------------
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reservations, isLoading, errorMessage } = useTodayReservations();

  const isOwner = user?.role === 'owner';
  const todayRevenue = sumTodayRevenue(reservations);

  return (
    <div className="min-h-dvh pb-24">
      <AppHeader title="ホーム" />

      <main className="px-5 -mt-2 space-y-5 pt-6">
        <p className="text-sm text-ink-soft">{formatDateJP(todayDateString())}</p>

        {/* オーナーのみ: 今日の売上 */}
        {isOwner && (
          <div className="glass-card p-5">
            <p className="text-xs text-ink-soft mb-1">今日の売上</p>
            <p
              className="text-3xl text-ink"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formatCurrency(todayRevenue)}
            </p>
          </div>
        )}

        {/* 今日の予約一覧 */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-ink">今日の予約</p>
            <span className="text-xs text-ink-soft">{reservations.length}件</span>
          </div>

          {isLoading && (
            <p className="text-sm text-ink-soft py-6 text-center">読み込み中…</p>
          )}

          {errorMessage && (
            <p className="text-sm text-lumina-pink-deep py-6 text-center">
              {errorMessage}
            </p>
          )}

          {!isLoading && !errorMessage && reservations.length === 0 && (
            <p className="text-sm text-ink-soft py-6 text-center">
              今日の予約はまだありません
            </p>
          )}

          {!isLoading && !errorMessage && reservations.length > 0 && (
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
