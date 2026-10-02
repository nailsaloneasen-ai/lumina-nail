import type { CancelStatus } from '../types';

/**
 * キャンセルまわりの判定ロジック
 * -----------------------------------------------------------------------
 * キャンセルした予約は削除せずに残す(お客様ごとのキャンセル回数を記録するため)。
 * そのため、売上・予約件数・未会計の判定などでは「キャンセルを除いた予約」
 * だけを数える必要がある。その判定をここにまとめる。
 * (Firebaseに依存しない純粋な関数だけを置き、どこからでも安全に使えるようにしている)
 * -----------------------------------------------------------------------
 */

export const CANCEL_STATUS_LABELS: Record<CancelStatus, string> = {
  canceled: 'キャンセル',
  no_show: '無断キャンセル',
};

interface MaybeCancelled {
  cancelStatus?: CancelStatus | null;
}

/** キャンセル(無断キャンセル含む)された予約かどうか */
export function isCancelled(reservation: MaybeCancelled): boolean {
  return (
    reservation.cancelStatus === 'canceled' || reservation.cancelStatus === 'no_show'
  );
}

/** キャンセルされていない(実際に来店予定の)予約だけを返す */
export function activeReservations<T extends MaybeCancelled>(reservations: T[]): T[] {
  return reservations.filter((r) => !isCancelled(r));
}

/**
 * キャンセル状態にできる予約かどうか。
 * 会計済みの予約は、売上に入っているためキャンセルにできない
 * (先に会計を取り消す必要がある)。すでにキャンセル済みの予約も対象外。
 */
export function canMarkCancelled(
  reservation: MaybeCancelled & { isPaid: boolean },
): boolean {
  return !reservation.isPaid && !isCancelled(reservation);
}

export interface CancellationCounts {
  /** 通常のキャンセル回数 */
  canceled: number;
  /** 無断キャンセル回数 */
  noShow: number;
}

/** 予約一覧から、キャンセル・無断キャンセルの回数を数える */
export function countCancellations(reservations: MaybeCancelled[]): CancellationCounts {
  let canceled = 0;
  let noShow = 0;
  for (const reservation of reservations) {
    if (reservation.cancelStatus === 'canceled') canceled += 1;
    else if (reservation.cancelStatus === 'no_show') noShow += 1;
  }
  return { canceled, noShow };
}

/** 「キャンセル2回・無断キャンセル1回」のような表示文字列。回数がどちらも0ならnull */
export function formatCancellationCounts(counts: CancellationCounts): string | null {
  const parts: string[] = [];
  if (counts.canceled > 0) parts.push(`キャンセル${counts.canceled}回`);
  if (counts.noShow > 0) parts.push(`無断キャンセル${counts.noShow}回`);
  return parts.length > 0 ? parts.join('・') : null;
}
