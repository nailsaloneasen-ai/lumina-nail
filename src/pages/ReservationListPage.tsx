import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeReservationsByDate } from '../lib/reservations';
import { formatCurrency, formatDateJP } from '../utils/format';
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
      <div className="no-print">
        <AppHeader title="予約一覧" />
      </div>

      <main className="no-print px-5 -mt-2 pt-6 space-y-4">
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

        {!isLoading && reservations.length > 0 && (
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full rounded-xl py-3 text-sm font-medium text-lumina-wisteria
                       border border-lumina-wisteria/30 transition-[background-color,transform]
                       active:bg-lumina-blush/40 active:scale-[0.98]"
          >
            PDF出力(印刷)
          </button>
        )}
      </main>

      {/* 印刷(PDF出力)専用の予約表。画面上には表示されず、印刷時にのみ表示される */}
      {!isLoading && (
        <PrintableReservationList date={date} reservations={reservations} />
      )}

      <div className="no-print">
        <BottomNav />
      </div>
    </div>
  );
}

/**
 * PDF出力(印刷)専用の、その日の予約一覧レイアウト。
 * 通常時は非表示(.print-only)で、window.print()が呼ばれた時のみ表示される。
 */
function PrintableReservationList({
  date,
  reservations,
}: {
  date: string;
  reservations: Reservation[];
}) {
  const sorted = [...reservations].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  return (
    <div className="print-only p-8 text-black">
      <h1 className="text-2xl font-bold mb-1">S'Argent 予約表</h1>
      <p className="text-sm mb-6">{formatDateJP(date)}</p>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-1 pr-3">時間</th>
            <th className="text-left py-1 pr-3">お客様名</th>
            <th className="text-left py-1 pr-3">指名</th>
            <th className="text-right py-1 pr-3">施術金額</th>
            <th className="text-left py-1">会計</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="border-b border-gray-300">
              <td className="py-1.5 pr-3">
                {r.startTime || '未定'}
                {r.endTime ? `〜${r.endTime}` : ''}
              </td>
              <td className="py-1.5 pr-3">{r.customerName}</td>
              <td className="py-1.5 pr-3">{r.isNominated ? 'あり' : ''}</td>
              <td className="py-1.5 pr-3 text-right">
                {r.priceAmount > 0 ? formatCurrency(r.priceAmount) : ''}
              </td>
              <td className="py-1.5">{r.isPaid ? '済' : '未'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
