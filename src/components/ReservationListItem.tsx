import { CANCEL_STATUS_LABELS, isCancelled } from '../lib/cancellation';
import type { Reservation } from '../types';

interface ReservationListItemProps {
  reservation: Reservation;
  onClick?: (reservation: Reservation) => void;
}

/**
 * 予約一覧・ホーム画面で使う1件分の予約表示。
 * 会計済みかどうかをアイコンで示す。
 */
export default function ReservationListItem({
  reservation,
  onClick,
}: ReservationListItemProps) {
  const cancelStatus = reservation.cancelStatus;
  const cancelled = isCancelled(reservation);

  return (
    <button
      type="button"
      onClick={() => onClick?.(reservation)}
      className={`w-full flex items-center gap-3 rounded-xl bg-white/70 px-4 py-3.5
                 text-left transition-[background-color,transform] active:bg-lumina-blush/40
                 active:scale-[0.98] ${cancelled ? 'opacity-60' : ''}`}
    >
      {/* 時間帯 */}
      <div className="flex flex-col items-center shrink-0 w-14">
        <span className="text-sm font-medium text-ink">{reservation.startTime}</span>
        <span className="text-[10px] text-ink-soft">{reservation.endTime}</span>
      </div>

      {/* 縦のアクセントライン */}
      <div
        className={`w-1 self-stretch rounded-full ${
          cancelled
            ? 'bg-status-none'
            : reservation.isPaid
              ? 'bg-status-paid'
              : 'bg-status-unpaid'
        }`}
      />

      {/* 顧客名 */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium text-ink truncate ${
            cancelled ? 'line-through' : ''
          }`}
        >
          {reservation.customerName}
        </p>
        <p className="text-xs text-ink-soft truncate">{reservation.durationMinutes}分</p>
      </div>

      {/* 会計状況(キャンセルされた予約は、キャンセルの種類を表示) */}
      {cancelled && cancelStatus ? (
        <span
          className="shrink-0 text-xs font-medium text-ink-soft bg-lumina-blush/60
                     rounded-full px-2.5 py-1"
        >
          {CANCEL_STATUS_LABELS[cancelStatus]}
        </span>
      ) : reservation.isPaid ? (
        <span
          className="shrink-0 text-xs font-medium text-white bg-status-paid
                     rounded-full px-2.5 py-1"
        >
          会計済
        </span>
      ) : (
        <span
          className="shrink-0 text-xs font-medium text-lumina-pink-deep
                     bg-lumina-cream rounded-full px-2.5 py-1"
        >
          未会計
        </span>
      )}
    </button>
  );
}
