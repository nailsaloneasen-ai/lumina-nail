import { useEffect, useState } from 'react';
import {
  groupReservationsByDate,
  subscribeReservationsByDateRange,
} from '../lib/reservations';
import type { Reservation } from '../types';

interface UseReservationsInRangeResult {
  /** 日付(YYYY-MM-DD) → その日の予約配列 */
  reservationsByDate: Map<string, Reservation[]>;
  isLoading: boolean;
  errorMessage: string | null;
}

/**
 * 指定した日付範囲(start〜end、YYYY-MM-DD)の予約一覧を取得し、
 * 日付ごとにグルーピングして返すフック。カレンダーの月表示・週表示の両方で使用する。
 */
export function useReservationsInRange(
  start: string,
  end: string,
): UseReservationsInRangeResult {
  const [reservationsByDate, setReservationsByDate] = useState<
    Map<string, Reservation[]>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeReservationsByDateRange(
      start,
      end,
      (reservations) => {
        setReservationsByDate(groupReservationsByDate(reservations));
        setIsLoading(false);
        setErrorMessage(null);
      },
      () => {
        setIsLoading(false);
        setErrorMessage('予約データの取得に失敗しました。通信環境をご確認ください。');
      },
    );

    return unsubscribe;
  }, [start, end]);

  return { reservationsByDate, isLoading, errorMessage };
}
