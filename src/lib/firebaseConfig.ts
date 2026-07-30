/**
 * Firebase設定値
 * -----------------------------------------------------------------------
 * ここに書く値は「公開されても問題ない値」です(Firebaseの仕組み上、
 * これらの値を隠す必要はなく、実際のセキュリティはFirestoreのルール
 * 〈firestore.rules〉で守られています)。そのため、GitHubにそのまま
 * アップロードして大丈夫です。
 *
 * 【編集方法】
 * 1. Firebase Consoleの「プロジェクトの設定」→「マイアプリ」を開く
 * 2. 表示されている値を、下の対応する場所にそのまま貼り付ける
 * 3. GitHub上でこのファイルを直接編集して保存(コミット)すれば、
 *    自動的にビルド・公開される
 * -----------------------------------------------------------------------
 */
import type { FirebaseOptions } from 'firebase/app';

export const firebaseConfig: FirebaseOptions = {
  apiKey: 'ここにFirebaseのapiKeyを貼り付ける',
  authDomain: 'ここにFirebaseのauthDomainを貼り付ける',
  projectId: 'ここにFirebaseのprojectIdを貼り付ける',
  storageBucket: 'ここにFirebaseのstorageBucketを貼り付ける',
  messagingSenderId: 'ここにFirebaseのmessagingSenderIdを貼り付ける',
  appId: 'ここにFirebaseのappIdを貼り付ける',
};
