import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PaymentHistoryEntry } from '../types';

/**
 * 会計修正履歴(reservations/{id}/history)の取得ロジック。
 * 履歴の書き込みは lib/reservations.ts の saveReservationPayment で行っている。
 * ここでは閲覧(オーナーのみ)に必要な読み取り処理のみを提供する。
 */
export function subscribePaymentHistory(
  reservationId: string,
  onData: (entries: PaymentHistoryEntry[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'reservations', reservationId, 'history'),
    orderBy('changedAt', 'desc'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as PaymentHistoryEntry,
      );
      onData(entries);
    },
    (error) => {
      console.error('修正履歴の取得に失敗しました', error);
      onError?.(error as Error);
    },
  );
}
