import { useEffect, useState } from 'react';
import { subscribeReservationsByDateRange } from '../lib/reservations';
import { filterUnpaidReservations, summarizeRevenue } from '../lib/revenue';
import type { Reservation, RevenueSummary } from '../types';

interface UseRevenueDataResult {
  summary: RevenueSummary;
  unpaidReservations: Reservation[];
  /** 期間内の全予約(支払い方法別の内訳表示などに使用) */
  reservations: Reservation[];
  isLoading: boolean;
  errorMessage: string | null;
}

const EMPTY_SUMMARY: RevenueSummary = {
  totalRevenue: 0,
  cashRevenue: 0,
  cardRevenue: 0,
  emoneyRevenue: 0,
  totalPointsUsed: 0,
  customerCount: 0,
  averageSpend: 0,
};

/**
 * 指定した日付範囲(start〜end、YYYY-MM-DD)の売上サマリーと未会計一覧を取得するフック。
 * 「今日/今月/年」のプリセット期間だけでなく、任意の期間指定(カスタム期間)にも対応する。
 */
export function useRevenueData(start: string, end: string): UseRevenueDataResult {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeReservationsByDateRange(
      start,
      end,
      (data) => {
        setReservations(data);
        setIsLoading(false);
        setErrorMessage(null);
      },
      () => {
        setIsLoading(false);
        setErrorMessage('売上データの取得に失敗しました。通信環境をご確認ください。');
      },
    );

    return unsubscribe;
  }, [start, end]);

  return {
    summary: reservations.length > 0 ? summarizeRevenue(reservations) : EMPTY_SUMMARY,
    unpaidReservations: filterUnpaidReservations(reservations),
    reservations,
    isLoading,
    errorMessage,
  };
}
