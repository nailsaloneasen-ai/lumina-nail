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
  /**
   * 取得件数が上限(REVENUE_QUERY_LIMIT)に達しており、集計結果が
   * 実際より少なく表示されている可能性がある場合にtrue。
   */
  isPossiblyIncomplete: boolean;
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
 * 売上集計の取得件数上限。
 * 小規模なサロン1店舗であれば通常到達しない値だが、データが何年も蓄積された場合の
 * 読み取り件数の際限ない増加(Firebase無料枠の消費)を防ぐための安全策として設定している。
 * 達した場合は isPossiblyIncomplete が true になるので、画面側で期間を狭めるよう案内する。
 */
const REVENUE_QUERY_LIMIT = 3000;

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
      REVENUE_QUERY_LIMIT,
    );

    return unsubscribe;
  }, [start, end]);

  return {
    summary: reservations.length > 0 ? summarizeRevenue(reservations) : EMPTY_SUMMARY,
    unpaidReservations: filterUnpaidReservations(reservations),
    reservations,
    isLoading,
    errorMessage,
    isPossiblyIncomplete: reservations.length >= REVENUE_QUERY_LIMIT,
  };
}
