import { useEffect, useState } from 'react';
import { subscribeReservationsByDate } from '../lib/reservations';
import { todayDateString } from '../utils/format';
import type { Reservation } from '../types';

interface UseTodayReservationsResult {
  reservations: Reservation[];
  isLoading: boolean;
  errorMessage: string | null;
}

/** 読み込み中に返す空配列(毎回新しい配列を作らないための定数) */
const NO_RESERVATIONS: Reservation[] = [];

/** 日付が変わっていないかを確認する間隔(ミリ秒) */
const DATE_CHECK_INTERVAL_MS = 60 * 1000;

/**
 * 今日の予約一覧をFirestoreからリアルタイムで取得するフック。
 *
 * iPhoneのホーム画面アプリ(PWA)は、一度開くと何日もメモリに残ったまま
 * 再開されることが多い。そのため、マウント時の日付を使い続けると
 * 翌日以降も前日の予約が「今日の予約」として表示されてしまう。
 * これを防ぐため、アプリが前面に戻ってきたとき・一定間隔ごとに日付を確認し、
 * 日付が変わっていたら今日の予約を取得し直す。
 */
export function useTodayReservations(): UseTodayReservationsResult {
  const [today, setToday] = useState(todayDateString);
  const [loaded, setLoaded] = useState<{
    date: string;
    reservations: Reservation[];
    errorMessage: string | null;
  } | null>(null);

  // 日付の変更を検知する(同じ日付ならstateは変わらず、再描画も起きない)
  useEffect(() => {
    function refreshToday() {
      setToday(todayDateString());
    }

    document.addEventListener('visibilitychange', refreshToday);
    window.addEventListener('focus', refreshToday);
    const timerId = window.setInterval(refreshToday, DATE_CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', refreshToday);
      window.removeEventListener('focus', refreshToday);
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeReservationsByDate(
      today,
      (data) => {
        setLoaded({ date: today, reservations: data, errorMessage: null });
      },
      () => {
        setLoaded({
          date: today,
          reservations: [],
          errorMessage: '予約データの取得に失敗しました。通信環境をご確認ください。',
        });
      },
    );

    return unsubscribe;
  }, [today]);

  const isCurrent = loaded !== null && loaded.date === today;

  return {
    reservations: isCurrent ? loaded.reservations : NO_RESERVATIONS,
    isLoading: !isCurrent,
    errorMessage: isCurrent ? loaded.errorMessage : null,
  };
}
