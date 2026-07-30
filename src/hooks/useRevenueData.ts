import { useEffect, useState } from 'react';
import { subscribeReservationsByDateRange } from '../lib/reservations';
import {
  dateRangeForPeriod,
  filterUnpaidReservations,
  summarizeRevenue,
} from '../lib/revenue';
import type { Reservation, RevenuePeriod, RevenueSummary } from '../types';

interface UseRevenueDataResult {
  summary: RevenueSummary;
  unpaidReservations: Reservation[];
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

/** 指定した期間(今日/今月/年)の売上サマリーと未会計一覧を取得するフック */
export function useRevenueData(period: RevenuePeriod): UseRevenueDataResult {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const { start, end } = dateRangeForPeriod(period);

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
  }, [period]);

  return {
    summary: reservations.length > 0 ? summarizeRevenue(reservations) : EMPTY_SUMMARY,
    unpaidReservations: filterUnpaidReservations(reservations),
    isLoading,
    errorMessage,
  };
}
