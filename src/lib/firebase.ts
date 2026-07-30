/**
 * Firebase初期化
 * -----------------------------------------------------------------------
 * 設定値は src/lib/firebaseConfig.ts に書かれた値を読み込む。
 * -----------------------------------------------------------------------
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

export const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);

/**
 * Firestoreはオフライン閲覧(要件: オフライン時は閲覧のみ可能)に対応するため、
 * persistentLocalCacheを有効化する。iPhoneのPWAはタブが1つのみの想定なので
 * persistentSingleTabManagerを使用する。
 */
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({}),
  }),
});
