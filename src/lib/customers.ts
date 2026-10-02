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
import { getDocs, query, where } from 'firebase/firestore';
import { countCancellations, type CancellationCounts } from './cancellation';
import { reservationsCollectionRef } from './reservations';
import type { Reservation } from '../types';

export interface CustomerSuggestion {
  customerName: string;
  customerKana: string;
  phoneNumber: string;
  /** 過去のキャンセル回数(無断キャンセルを除く) */
  canceledCount: number;
  /** 過去の無断キャンセル回数 */
  noShowCount: number;
}

let cachedSuggestions: CustomerSuggestion[] | null = null;

/**
 * 顧客リストのキャッシュを破棄する。
 * 予約を登録・編集した後に呼ぶと、次に予約フォームを開いたとき最新の顧客名が候補に出る
 * (呼ばないと、アプリを再読み込みするまで新しく登録した顧客が候補に出ない)。
 */
export function invalidateCustomerSuggestions(): void {
  cachedSuggestions = null;
}

/** 過去の全予約から重複のない顧客リストを作る(結果はメモリにキャッシュされる) */
export async function getCustomerSuggestions(): Promise<CustomerSuggestion[]> {
  if (cachedSuggestions) return cachedSuggestions;

  const snapshot = await getDocs(reservationsCollectionRef());
  const seen = new Map<string, CustomerSuggestion>();

  snapshot.docs.forEach((docSnapshot) => {
    const data = docSnapshot.data() as Reservation;
    if (data.isDeleted || !data.customerName) return;

    const key = data.phoneNumber
      ? `phone:${data.phoneNumber}`
      : `name:${data.customerName}`;
    let entry = seen.get(key);
    if (!entry) {
      entry = {
        customerName: data.customerName,
        customerKana: data.customerKana ?? '',
        phoneNumber: data.phoneNumber ?? '',
        canceledCount: 0,
        noShowCount: 0,
      };
      seen.set(key, entry);
    }
    // お客様ごとのキャンセル回数を、同じ顧客の全予約から集計する
    if (data.cancelStatus === 'canceled') entry.canceledCount += 1;
    else if (data.cancelStatus === 'no_show') entry.noShowCount += 1;
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

/**
 * ある顧客の通算キャンセル回数を取得する(予約詳細画面で使用)。
 * 電話番号があれば電話番号で、なければ名前で同じ顧客かを判定する
 * (顧客リストの重複判定と同じ基準)。その顧客の予約だけを読み込むので、
 * 全予約を読み込む顧客リストより読み取り回数が少なくて済む。
 */
export async function getCancellationCounts(customer: {
  customerName: string;
  phoneNumber: string;
}): Promise<CancellationCounts> {
  const q = customer.phoneNumber
    ? query(
        reservationsCollectionRef(),
        where('phoneNumber', '==', customer.phoneNumber),
        where('isDeleted', '==', false),
      )
    : query(
        reservationsCollectionRef(),
        where('customerName', '==', customer.customerName),
        where('isDeleted', '==', false),
      );
  const snapshot = await getDocs(q);
  return countCancellations(snapshot.docs.map((d) => d.data() as Reservation));
}
