import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type User,
} from 'firebase/auth';

/**
 * パスワード変更ロジック
 * -----------------------------------------------------------------------
 * 【重要な制約】Firebase Authenticationのクライアント側SDKでは、
 * ログイン中の自分自身のパスワードしか変更できない(他ユーザーの
 * パスワードを変更するには管理者権限のAdmin SDK/Cloud Functionsが必要だが、
 * このアプリはサーバーレス・無料構成のため導入していない)。
 *
 * そのため、この画面は「今ログインしているアカウント自身のパスワード変更」
 * のみに対応する。もう一方のアカウントのパスワードをリセットしたい場合は、
 * Firebase Consoleから手動で変更する必要がある(README参照)。
 * -----------------------------------------------------------------------
 */
export async function changeOwnPassword(
  user: User,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!user.email) {
    throw new Error('ユーザー情報の取得に失敗しました');
  }

  // パスワード変更はセキュリティ上、直前の再認証が必須(Firebaseの仕様)
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
