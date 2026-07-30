import { useEffect, useState } from 'react';
import { subscribeReservation } from '../lib/reservations';
import type { Reservation } from '../types';

interface UseReservationResult {
  reservation: Reservation | null | undefined; // undefined = 読み込み中
  errorMessage: string | null;
}

/** 予約1件をFirestoreからリアルタイムで取得するフック(予約詳細画面用) */
export function useReservation(id: string | undefined): UseReservationResult {
  const [reservation, setReservation] = useState<Reservation | null | undefined>(
    undefined,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeReservation(
      id,
      (data) => {
        setReservation(data);
        setErrorMessage(null);
      },
      () => {
        setErrorMessage('予約データの取得に失敗しました。通信環境をご確認ください。');
      },
    );

    return unsubscribe;
  }, [id]);

  return { reservation, errorMessage };
}
