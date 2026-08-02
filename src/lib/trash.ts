import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Reservation } from '../types';

const RESERVATIONS_COLLECTION = 'reservations';
const TRASH_RETENTION_DAYS = 30;

/**
 * ゴミ箱(論理削除済み予約)まわりのロジック
 * -----------------------------------------------------------------------
 * 【重要な制約】S'Argentはサーバーレス構成(Firebase無料枠のみ)で、
 * 定期実行サーバー(Cloud Functions等)を使わない方針のため、
 * 「30日後に自動削除」はサーバー側のスケジューラーでは実現できない。
 * 代わりに、ゴミ箱画面を開くたびに期限切れの予約をクライアント側から
 * 完全削除する「遅延クリーンアップ」方式を採用する。
 * -----------------------------------------------------------------------
 */

/** 論理削除済みの予約一覧をリアルタイム購読する(削除日時の新しい順) */
export function subscribeTrashedReservations(
  onData: (reservations: Reservation[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, RESERVATIONS_COLLECTION),
    where('isDeleted', '==', true),
    orderBy('deletedAt', 'desc'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reservations = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Reservation,
      );
      onData(reservations);
    },
    (error) => {
      console.error('ゴミ箱データの取得に失敗しました', error);
      onError?.(error as Error);
    },
  );
}

/** 予約を復元する(ゴミ箱から元に戻す) */
export async function restoreReservation(id: string, uid: string): Promise<void> {
  await updateDoc(doc(db, RESERVATIONS_COLLECTION, id), {
    isDeleted: false,
    deletedAt: null,
    updatedAt: new Date().toISOString(),
    updatedBy: uid,
  });
}

/** 予約を完全に削除する(ゴミ箱からも消え、復元不可) */
export async function permanentlyDeleteReservation(id: string): Promise<void> {
  await deleteDoc(doc(db, RESERVATIONS_COLLECTION, id));
}

/** 削除日からの経過日数を計算する */
export function daysSinceDeleted(deletedAt: string): number {
  const diffMs = Date.now() - new Date(deletedAt).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** 削除から30日経過し、自動削除の対象となる予約かどうかを判定する */
export function isExpired(deletedAt: string): boolean {
  return daysSinceDeleted(deletedAt) >= TRASH_RETENTION_DAYS;
}

/**
 * ゴミ箱内で30日以上経過した予約を完全削除する(遅延クリーンアップ)。
 * ゴミ箱画面を開いたタイミングで一度だけ実行することを想定している。
 */
export async function purgeExpiredTrash(): Promise<number> {
  const q = query(
    collection(db, RESERVATIONS_COLLECTION),
    where('isDeleted', '==', true),
  );
  const snapshot = await getDocs(q);

  const expiredDocs = snapshot.docs.filter((d) => {
    const deletedAt = (d.data() as Reservation).deletedAt;
    return deletedAt && isExpired(deletedAt);
  });

  await Promise.all(expiredDocs.map((d) => deleteDoc(d.ref)));
  return expiredDocs.length;
}
