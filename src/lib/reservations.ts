import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PaymentHistoryEntry, PaymentInfo, Reservation } from '../types';

/** Firestoreの予約コレクション名 */
const RESERVATIONS_COLLECTION = 'reservations';

export function reservationsCollectionRef() {
  return collection(db, RESERVATIONS_COLLECTION);
}

/**
 * 指定した日付の予約一覧をリアルタイム購読する(削除済みは除外、開始時刻順)。
 * コールバックはFirestoreのデータが変化するたびに呼ばれる。
 *
 * @param date YYYY-MM-DD形式
 * @param onData 予約一覧を受け取るコールバック
 * @param onError 購読エラー時のコールバック(オフライン時などに発生しうる)
 * @returns 購読解除用の関数。コンポーネントのuseEffectのクリーンアップで呼ぶこと。
 */
export function subscribeReservationsByDate(
  date: string,
  onData: (reservations: Reservation[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    reservationsCollectionRef(),
    where('date', '==', date),
    where('isDeleted', '==', false),
    orderBy('startTime', 'asc'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reservations = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Reservation,
      );
      onData(reservations);
    },
    (error) => {
      console.error('予約データの取得に失敗しました', error);
      onError?.(error as Error);
    },
  );
}

/**
 * 予約一覧から本日の売上を集計する。
 * 会計済み(isPaid) かつ 売上対象(isRevenueTarget) の予約のみを合算する。
 */
export function sumTodayRevenue(reservations: Reservation[]): number {
  return reservations.reduce((total, reservation) => {
    const payment = reservation.payment;
    if (reservation.isPaid && payment && payment.isRevenueTarget) {
      return total + payment.paidAmount;
    }
    return total;
  }, 0);
}

/**
 * 指定した期間(start〜end、YYYY-MM-DD)内の予約一覧をリアルタイム購読する。
 * カレンダー画面の月表示・週表示、および売上集計で使用する。
 *
 * @param maxResults 取得件数の上限(省略時は無制限)。売上集計など、
 *   データが増えた場合に読み取り件数が際限なく増えるのを防ぐために使う。
 *   カレンダー表示(月・週)は範囲が元々狭く実質問題にならないため、通常は省略でよい。
 */
export function subscribeReservationsByDateRange(
  start: string,
  end: string,
  onData: (reservations: Reservation[]) => void,
  onError?: (error: Error) => void,
  maxResults?: number,
): Unsubscribe {
  const constraints = [
    where('date', '>=', start),
    where('date', '<=', end),
    where('isDeleted', '==', false),
  ];
  const q =
    maxResults !== undefined
      ? query(reservationsCollectionRef(), ...constraints, limit(maxResults))
      : query(reservationsCollectionRef(), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const reservations = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Reservation,
      );
      onData(reservations);
    },
    (error) => {
      console.error('期間指定の予約データの取得に失敗しました', error);
      onError?.(error as Error);
    },
  );
}

/**
 * 予約一覧を日付ごとにグルーピングし、カレンダー表示用の集計情報に変換する。
 * key: YYYY-MM-DD, value: その日の予約配列
 */
export function groupReservationsByDate(
  reservations: Reservation[],
): Map<string, Reservation[]> {
  const map = new Map<string, Reservation[]>();
  for (const reservation of reservations) {
    const list = map.get(reservation.date) ?? [];
    list.push(reservation);
    map.set(reservation.date, list);
  }
  return map;
}

/**
 * ある日の予約配列から、カレンダーの色分け判定用ステータスを算出する。
 * - none: 予約なし
 * - unpaid: 1件でも未会計がある
 * - paid: 予約が1件以上あり、すべて会計済み
 */
export function getDayStatus(
  dayReservations: Reservation[] | undefined,
): 'none' | 'unpaid' | 'paid' {
  if (!dayReservations || dayReservations.length === 0) return 'none';
  const hasUnpaid = dayReservations.some((r) => !r.isPaid);
  return hasUnpaid ? 'unpaid' : 'paid';
}

/** 予約1件をリアルタイム購読する(予約詳細画面で使用) */
export function subscribeReservation(
  id: string,
  onData: (reservation: Reservation | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, RESERVATIONS_COLLECTION, id),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData({ id: snapshot.id, ...snapshot.data() } as Reservation);
    },
    (error) => {
      console.error('予約詳細の取得に失敗しました', error);
      onError?.(error as Error);
    },
  );
}

/** 新規予約の作成に必要な入力項目(自動計算・自動付与される項目は含まない) */
export interface ReservationInput {
  customerName: string;
  customerKana: string;
  phoneNumber: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  endTime: string;
  priceAmount: number;
  memo: string;
  isNominated: boolean;
}

/** 新規予約をFirestoreに作成する */
export async function createReservation(
  input: ReservationInput,
  uid: string,
): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(reservationsCollectionRef(), {
    ...input,
    payment: null,
    isPaid: false,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    createdBy: uid,
    updatedAt: now,
    updatedBy: uid,
  });
  return docRef.id;
}

/** 既存予約の内容(顧客情報・日時・金額・メモ)を更新する */
export async function updateReservationDetails(
  id: string,
  input: ReservationInput,
  uid: string,
): Promise<void> {
  await updateDoc(doc(db, RESERVATIONS_COLLECTION, id), {
    ...input,
    updatedAt: new Date().toISOString(),
    updatedBy: uid,
  });
}

/** メモのみを更新する(会計画面から従業員が編集する場合に使用) */
export async function updateReservationMemo(
  id: string,
  memo: string,
  uid: string,
): Promise<void> {
  await updateDoc(doc(db, RESERVATIONS_COLLECTION, id), {
    memo,
    updatedAt: new Date().toISOString(),
    updatedBy: uid,
  });
}

/** 予約を論理削除する(ゴミ箱へ移動。30日後に自動削除・復元可能) */
export async function softDeleteReservation(id: string, uid: string): Promise<void> {
  await updateDoc(doc(db, RESERVATIONS_COLLECTION, id), {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: uid,
  });
}

/**
 * 指定した日付・時間帯に重複する予約があるかを一度だけ取得して判定する。
 * excludeId を指定すると、編集中の予約自身は重複判定から除外する。
 */
export async function findOverlappingReservations(
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string,
): Promise<Reservation[]> {
  const q = query(
    reservationsCollectionRef(),
    where('date', '==', date),
    where('isDeleted', '==', false),
  );
  const snapshot = await getDocs(q);
  const reservations = snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Reservation)
    .filter((r) => r.id !== excludeId);

  // 時間帯が重なっているか判定: 既存の開始 < 新しい終了 かつ 既存の終了 > 新しい開始
  return reservations.filter((r) => r.startTime < endTime && r.endTime > startTime);
}

/** 予約1件を一度だけ取得する(存在しない場合はnull) */
export async function getReservationOnce(id: string): Promise<Reservation | null> {
  const snapshot = await getDoc(doc(db, RESERVATIONS_COLLECTION, id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Reservation;
}

/** 修正履歴のサブコレクション参照(reservations/{id}/history) */
function paymentHistoryCollectionRef(reservationId: string) {
  return collection(db, RESERVATIONS_COLLECTION, reservationId, 'history');
}

/**
 * 会計情報を保存する(新規会計・修正の両方に対応)。
 * 保存と同時に修正履歴(変更前・変更後)を記録する。
 * 予約時点で未定だった施術金額を、会計時にあわせて確定させることもできる。
 *
 * @param priceAmount 施術金額(会計時に確定・修正した値)
 * @param isPaidChecked 「会計済」チェックボックスの状態
 */
export async function saveReservationPayment(
  reservationId: string,
  previousPayment: PaymentInfo | null,
  newPayment: PaymentInfo,
  priceAmount: number,
  isPaidChecked: boolean,
  uid: string,
  displayName: string,
): Promise<void> {
  const now = new Date().toISOString();

  // 予約本体を更新
  await updateDoc(doc(db, RESERVATIONS_COLLECTION, reservationId), {
    payment: newPayment,
    priceAmount,
    isPaid: isPaidChecked,
    updatedAt: now,
    updatedBy: uid,
  });

  // 修正履歴を記録(オーナーのみ閲覧可能)
  const historyEntry: Omit<PaymentHistoryEntry, 'id'> = {
    reservationId,
    changedAt: now,
    changedBy: uid,
    changedByName: displayName,
    before: previousPayment,
    after: newPayment,
  };
  await addDoc(paymentHistoryCollectionRef(reservationId), historyEntry);
}

/** 検索1回あたり、各クエリ(顧客名/読み仮名)ごとに取得する最大件数 */
const SEARCH_QUERY_LIMIT = 50;

export interface SearchReservationsResult {
  reservations: Reservation[];
  /**
   * 顧客名・読み仮名いずれかのクエリが上限件数ちょうどヒットした場合にtrueになる。
   * この場合、本来はもっと該当件数がある可能性があるため、
   * 画面側で「検索文字を増やして絞り込んでください」等の案内に使う。
   */
  isPossiblyTruncated: boolean;
}

/**
 * 顧客名・読み仮名で予約を検索する(前方一致)。
 * Firestoreは全文検索に対応していないため、range検索(>=, <=)を使った
 * 前方一致検索という形で実装している('\uf8ff' はUnicodeのほぼ最大値の文字で、
 * 「入力文字列で始まるすべての文字列」を表す範囲の終端として使う定石)。
 *
 * 顧客名(customerName)と読み仮名(customerKana)の両方を対象に検索し、
 * 結果をマージして重複を除いたうえで、日付の新しい順に並べて返す。
 * 削除済み(ゴミ箱)の予約は検索対象外。
 *
 * データが増えた場合に検索が重くなりすぎないよう、各クエリにSEARCH_QUERY_LIMIT件の
 * 上限を設けている。同姓同名などで上限に達した場合はisPossiblyTruncatedがtrueになる。
 */
export async function searchReservationsByCustomerName(
  queryText: string,
): Promise<SearchReservationsResult> {
  const trimmed = queryText.trim();
  if (!trimmed) return { reservations: [], isPossiblyTruncated: false };

  const upperBound = `${trimmed}\uf8ff`;

  const [byName, byKana] = await Promise.all([
    getDocs(
      query(
        reservationsCollectionRef(),
        where('isDeleted', '==', false),
        where('customerName', '>=', trimmed),
        where('customerName', '<=', upperBound),
        limit(SEARCH_QUERY_LIMIT),
      ),
    ),
    getDocs(
      query(
        reservationsCollectionRef(),
        where('isDeleted', '==', false),
        where('customerKana', '>=', trimmed),
        where('customerKana', '<=', upperBound),
        limit(SEARCH_QUERY_LIMIT),
      ),
    ),
  ]);

  const isPossiblyTruncated =
    byName.docs.length >= SEARCH_QUERY_LIMIT || byKana.docs.length >= SEARCH_QUERY_LIMIT;

  const resultMap = new Map<string, Reservation>();
  for (const docSnapshot of [...byName.docs, ...byKana.docs]) {
    resultMap.set(docSnapshot.id, {
      id: docSnapshot.id,
      ...docSnapshot.data(),
    } as Reservation);
  }

  const reservations = Array.from(resultMap.values()).sort((a, b) =>
    (b.date + b.startTime).localeCompare(a.date + a.startTime),
  );

  return { reservations, isPossiblyTruncated };
}
