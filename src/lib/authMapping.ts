import type { UserRole } from '../types';

/**
 * 認証まわりの定数・変換ロジック
 * -----------------------------------------------------------------------
 * S'Argentはユーザーが「オーナー」「従業員」の2名のみという特殊な要件のため、
 * Firebase Authenticationの標準的なメール/パスワード認証を、画面上はID/PW入力に
 * 見せかけて使う。実際の認証は下記の疑似メールアドレスに対して行う。
 *
 * 【重要】この変換ロジックは表示専用のマッピングであり、Firestoreのアクセス制御は
 * ここではなく Firestore Security Rules 側で行う(ステップ10で設定)。
 * -----------------------------------------------------------------------
 */

/** ログイン画面で入力されるID */
export const LOGIN_IDS = {
  owner: 'owner',
  guest: 'guest',
} as const;

export type LoginId = (typeof LOGIN_IDS)[keyof typeof LOGIN_IDS];

/** ログインIDごとの表示名・権限の対応表 */
const LOGIN_ID_META: Record<LoginId, { role: UserRole; displayName: string }> = {
  owner: { role: 'owner', displayName: 'オーナー' },
  guest: { role: 'staff', displayName: '従業員' },
};

/** Firebase Authenticationのドメイン(実在しないダミードメインでよい) */
const AUTH_EMAIL_DOMAIN = 'lumina-nail.local';

/**
 * 画面入力のログインID(owner/guest)を、Firebase Authentication用の
 * ダミーメールアドレスに変換する。
 */
export function loginIdToEmail(loginId: string): string {
  return `${loginId.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

/** 入力されたIDが既知のログインIDかどうかを判定する */
export function isKnownLoginId(loginId: string): loginId is LoginId {
  return loginId.trim().toLowerCase() in LOGIN_ID_META;
}

/** ログインIDから権限・表示名を取得する */
export function getLoginIdMeta(loginId: LoginId) {
  return LOGIN_ID_META[loginId];
}
