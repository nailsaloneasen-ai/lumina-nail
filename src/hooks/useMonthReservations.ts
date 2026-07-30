import { useEffect, useState } from 'react';
import {
  groupReservationsByDate,
  subscribeReservationsByDateRange,
} from '../lib/reservations';
import { monthDateRange } from '../utils/calendar';
import type { Reservation } from '../types';

interface UseMonthReservationsResult {
  /** 日付(YYYY-MM-DD) → その日の予約配列 */
  reservationsByDate: Map<string, Reservation[]>;
  isLoading: boolean;
  errorMessage: string | null;
}

/** 指定した年月の予約一覧を取得し、日付ごとにグルーピングして返すフック */
export function useMonthReservations(
  year: number,
  month: number,
): UseMonthReservationsResult {
  const [reservationsByDate, setReservationsByDate] = useState<
    Map<string, Reservation[]>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const { start, end } = monthDateRange(year, month);

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
  }, [year, month]);

  return { reservationsByDate, isLoading, errorMessage };
}
