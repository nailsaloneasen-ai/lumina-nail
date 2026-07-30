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
  apiKey: 'AIzaSyD9MonEhL-uC2nfoiRIrtnJJyUhZftPX00',
  authDomain: 'lumina-nail.firebaseapp.com',
  projectId: 'lumina-nail',
  storageBucket: 'lumina-nail.firebasestorage.app',
  messagingSenderId: '812999528343',
  appId: '1:812999528343:web:eacec3d9b4606be71f3ed2',
};
