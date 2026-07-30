import { useEffect, useState } from 'react';
import { subscribeReservationsByDate } from '../lib/reservations';
import { todayDateString } from '../utils/format';
import type { Reservation } from '../types';

interface UseTodayReservationsResult {
  reservations: Reservation[];
  isLoading: boolean;
  errorMessage: string | null;
}

/**
 * 今日の予約一覧をFirestoreからリアルタイムで取得するフック。
 * 日付をまたいだままアプリを開きっぱなしにするケースは稀なため、
 * 日付の再計算はマウント時のみ行う。
 */
export function useTodayReservations(): UseTodayReservationsResult {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const today = todayDateString();

    const unsubscribe = subscribeReservationsByDate(
      today,
      (data) => {
        setReservations(data);
        setIsLoading(false);
        setErrorMessage(null);
      },
      () => {
        setIsLoading(false);
        setErrorMessage('予約データの取得に失敗しました。通信環境をご確認ください。');
      },
    );

    return unsubscribe;
  }, []);

  return { reservations, isLoading, errorMessage };
}
