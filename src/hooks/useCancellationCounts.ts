import { useEffect, useState } from 'react';
import type { CancellationCounts } from '../lib/cancellation';
import { getCancellationCounts } from '../lib/customers';

/**
 * 顧客の通算キャンセル回数を取得するフック(予約詳細画面で使用)。
 * 取得できなかった場合(通信エラー等)や、読み込み中はnullを返す
 * (キャンセル回数は補助的な表示なので、取得失敗でも画面全体は止めない)。
 *
 * @param refreshKey この値が変わると取得し直す(キャンセル操作の直後に回数を更新するため)
 */
export function useCancellationCounts(
  customerName: string | undefined,
  phoneNumber: string | undefined,
  refreshKey: string,
): CancellationCounts | null {
  const requestKey = `${customerName ?? ''}|${phoneNumber ?? ''}|${refreshKey}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    counts: CancellationCounts;
  } | null>(null);

  useEffect(() => {
    if (!customerName) return;
    let isCancelled = false;
    getCancellationCounts({ customerName, phoneNumber: phoneNumber ?? '' })
      .then((counts) => {
        if (!isCancelled) setLoaded({ key: requestKey, counts });
      })
      .catch(() => {
        // 補助的な表示のため、失敗しても何もしない
      });
    return () => {
      isCancelled = true;
    };
  }, [customerName, phoneNumber, requestKey]);

  // 別の顧客・別の状態のときに取得した古い結果は使わない
  return loaded !== null && loaded.key === requestKey ? loaded.counts : null;
}
