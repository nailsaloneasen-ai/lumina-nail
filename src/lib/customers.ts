/**
 * 顧客の入力補完(オートコンプリート)
 * -----------------------------------------------------------------------
 * 新しい仕組みを別に作るのではなく、既にある予約データ(顧客名・読み仮名・
 * 電話番号)を読み替えて、重複のない「顧客リスト」として使い回す。
 *
 * - 電話番号があればそれで、なければ名前で重複を判定する
 * - ゴミ箱に入っている(isDeleted)予約の顧客は候補に含めない
 * - 毎回全件読み込むと通信量・Firestoreの読み取り回数が無駄に増えるため、
 *   一度取得したらアプリを再読み込みするまでメモリ上にキャッシュする
 * -----------------------------------------------------------------------
 */
import { getDocs } from 'firebase/firestore';
import { reservationsCollectionRef } from './reservations';
import type { Reservation } from '../types';

export interface CustomerSuggestion {
  customerName: string;
  customerKana: string;
  phoneNumber: string;
}

let cachedSuggestions: CustomerSuggestion[] | null = null;

/** 過去の全予約から重複のない顧客リストを作る(結果はメモリにキャッシュされる) */
export async function getCustomerSuggestions(): Promise<CustomerSuggestion[]> {
  if (cachedSuggestions) return cachedSuggestions;

  const snapshot = await getDocs(reservationsCollectionRef());
  const seen = new Map<string, CustomerSuggestion>();

  snapshot.docs.forEach((docSnapshot) => {
    const data = docSnapshot.data() as Reservation;
    if (data.isDeleted || !data.customerName) return;

    const key = data.phoneNumber ? `phone:${data.phoneNumber}` : `name:${data.customerName}`;
    if (!seen.has(key)) {
      seen.set(key, {
        customerName: data.customerName,
        customerKana: data.customerKana ?? '',
        phoneNumber: data.phoneNumber ?? '',
      });
    }
  });

  cachedSuggestions = Array.from(seen.values());
  return cachedSuggestions;
}

/**
 * 入力中の文字列で顧客リストを絞り込む(名前の先頭一致のみ。
 * 検索画面と同じく、部分一致・あいまい検索には対応していない)。
 */
export function filterCustomerSuggestions(
  suggestions: CustomerSuggestion[],
  query: string,
  maxResults = 5,
): CustomerSuggestion[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return suggestions
    .filter((s) => s.customerName.startsWith(trimmed))
    .slice(0, maxResults);
}
