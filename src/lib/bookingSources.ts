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

/**
 * 予約媒体の選択肢一覧を取得する。
 * まだ一度も設定されていない(ドキュメント自体がない)場合のみ初期値を返す(Firestoreには保存しない)。
 * 設定画面で全て削除して空にした場合は、空のまま返す
 * (空配列を「未設定」と同一視すると、削除したはずの初期値が再読み込みで復活してしまう)。
 */
export async function getBookingSources(): Promise<string[]> {
  const snapshot = await getDoc(bookingSourcesDocRef());
  const sources = snapshot.data()?.sources;
  return Array.isArray(sources) ? (sources as string[]) : DEFAULT_SOURCES;
}

/** 予約媒体の選択肢一覧を保存する(オーナーのみ実行可能) */
export async function setBookingSources(sources: string[]): Promise<void> {
  await setDoc(bookingSourcesDocRef(), { sources }, { merge: true });
}
