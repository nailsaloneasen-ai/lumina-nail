/**
 * S'Argent 型定義
 * -----------------------------------------------------------------------
 * アプリ全体で共有するドメインモデルをここに集約する。
 * Firestore のドキュメント形状とほぼ1対1になるように設計している。
 * -----------------------------------------------------------------------
 */

/** ユーザー権限。オーナーは全操作可、従業員は限定操作のみ。 */
export type UserRole = 'owner' | 'staff';

/** ログイン中のユーザー情報(Firebase Authenticationのuidと紐づく) */
export interface AppUser {
  uid: string;
  loginId: string; // 'owner' | 'gest'
  displayName: string;
  role: UserRole;
}

/** 支払い方法 */
export type PaymentMethod = 'cash' | 'card' | 'emoney';

/**
 * 予約(1件のネイル施術予約)
 * Firestore コレクション: reservations/{reservationId}
 */
export interface Reservation {
  id: string;

  // --- 顧客情報 ---
  customerName: string;
  customerKana: string;
  phoneNumber: string; // 表示用に自動整形("090-1234-5678")

  // --- 日時 ---
  /** 予約対象日。YYYY-MM-DD 形式(タイムゾーンに依存しないためstring管理) */
  date: string;
  /** 開始時刻。HH:mm 形式 */
  startTime: string;
  /** 施術時間(分) */
  durationMinutes: number;
  /** 終了時刻。startTime + durationMinutes から自動計算しFirestoreにも保存(検索・表示高速化のため) */
  endTime: string;

  // --- 金額・メモ ---
  /** 施術金額(円) */
  priceAmount: number;
  memo: string;

  // --- 会計情報 ---
  payment: PaymentInfo | null;
  isPaid: boolean;

  // --- 削除(論理削除・ゴミ箱) ---
  isDeleted: boolean;
  deletedAt: string | null; // ISO8601。30日後自動削除の判定に使用

  // --- メタ情報 ---
  createdAt: string; // ISO8601
  createdBy: string; // uid
  updatedAt: string; // ISO8601
  updatedBy: string; // uid
}

/** 会計(支払い)情報。Reservationにネストして保持する。 */
export interface PaymentInfo {
  /** 使用ポイント(円換算) */
  pointsUsed: number;
  /** 実際の支払金額 = priceAmount - pointsUsed */
  paidAmount: number;
  method: PaymentMethod;
  /** 売上集計対象にするか(OFFの場合は集計から除外) */
  isRevenueTarget: boolean;
  /** 会計完了日時。ISO8601 */
  paidAt: string;
  paidBy: string; // uid
}

/**
 * 会計修正履歴(監査ログ)。オーナーのみ閲覧可。
 * Firestore コレクション: reservations/{reservationId}/history/{historyId}
 */
export interface PaymentHistoryEntry {
  id: string;
  reservationId: string;
  changedAt: string; // ISO8601
  changedBy: string; // uid
  changedByName: string;
  /** 変更前のPaymentInfo(なければ新規会計として null) */
  before: PaymentInfo | null;
  /** 変更後のPaymentInfo */
  after: PaymentInfo;
}

/** カレンダー1日分の集計結果(表示用に予約一覧から算出する派生データ) */
export interface DayAggregate {
  date: string; // YYYY-MM-DD
  reservationCount: number;
  hasUnpaid: boolean;
  allPaid: boolean;
  isToday: boolean;
}

/** 売上集計(期間指定: 今日 / 今月 / 年) */
export interface RevenueSummary {
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  emoneyRevenue: number;
  totalPointsUsed: number;
  customerCount: number;
  averageSpend: number;
}

export type RevenuePeriod = 'today' | 'month' | 'year' | 'custom';

/** バックアップ(JSONエクスポート/インポート)のペイロード形状 */
export interface BackupPayload {
  exportedAt: string;
  version: 1;
  reservations: Reservation[];
}
