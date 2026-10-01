/**
 * 予約媒体(ホットペッパー・ミニモ・ネイリーなど)の選択肢を扱う。
 * -----------------------------------------------------------------------
 * Firestoreの settings/bookingSources ドキュメントに、選択肢の配列を
 * そのまま保存する。設定画面(オーナー専用)から追加・削除できる。
 * -----------------------------------------------------------------------
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_COLLECTION = 'settings';
const BOOKING_SOURCES_DOC_ID = 'bookingSources';

/** 初回(まだ何も設定されていない)の初期値 */
const DEFAULT_SOURCES = ['ホットペッパー', 'ミニモ', 'ネイリー'];

function bookingSourcesDocRef() {
  return doc(db, SETTINGS_COLLECTION, BOOKING_SOURCES_DOC_ID);
}

/** 予約媒体の選択肢一覧を取得する。未設定の場合は初期値を返す(Firestoreには保存しない) */
export async function getBookingSources(): Promise<string[]> {
  const snapshot = await getDoc(bookingSourcesDocRef());
  const data = snapshot.data();
  const sources = data?.sources as string[] | undefined;
  return sources && sources.length > 0 ? sources : DEFAULT_SOURCES;
}

/** 予約媒体の選択肢一覧を保存する(オーナーのみ実行可能) */
export async function setBookingSources(sources: string[]): Promise<void> {
  await setDoc(bookingSourcesDocRef(), { sources }, { merge: true });
}
