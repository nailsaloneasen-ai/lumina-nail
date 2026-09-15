/**
 * アプリ全体の設定値(Firestoreの settings コレクション)を扱う。
 * -----------------------------------------------------------------------
 * 現在は「予約通知メールの送信先(スタッフのメールアドレス)」のみを管理する。
 * 設定画面(オーナー専用)から登録・変更できる。
 * -----------------------------------------------------------------------
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_COLLECTION = 'settings';
const NOTIFICATIONS_DOC_ID = 'notifications';

export interface NotificationSettings {
  /** 新規予約が入ったときの通知メール送信先 */
  staffEmail: string;
}

function notificationsDocRef() {
  return doc(db, SETTINGS_COLLECTION, NOTIFICATIONS_DOC_ID);
}

/** 通知設定を取得する。未登録の場合は空文字を返す */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const snapshot = await getDoc(notificationsDocRef());
  const data = snapshot.data();
  return { staffEmail: (data?.staffEmail as string | undefined) ?? '' };
}

/** スタッフの通知先メールアドレスを保存する(オーナーのみ実行可能) */
export async function setStaffEmail(staffEmail: string): Promise<void> {
  await setDoc(notificationsDocRef(), { staffEmail }, { merge: true });
}
