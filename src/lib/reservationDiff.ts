/**
 * 予約編集時の「変更点の差分」を作る。
 * -----------------------------------------------------------------------
 * 編集画面を開いた時点の値(変更前)と、保存ボタンを押した時点の値(変更後)を
 * 項目ごとに比較し、変わった項目だけを人が読める文章のリストにする。
 * 変更通知メール(src/lib/notify.ts)の本文に使う。
 * -----------------------------------------------------------------------
 */
import { formatCurrency, formatDateJP } from '../utils/format';

/** 差分比較の対象になる予約フォームの値 */
export interface ReservationSnapshot {
  date: string;
  startTime: string;
  durationMinutes: number;
  customerName: string;
  customerKana: string;
  phoneDigits: string;
  priceAmount: number;
  isNominated: boolean;
  memo: string;
}

const FIELD_LABELS: Record<keyof ReservationSnapshot, string> = {
  date: '日付',
  startTime: '開始時間',
  durationMinutes: '施術時間',
  customerName: 'お客様名',
  customerKana: 'フリガナ',
  phoneDigits: '電話番号',
  priceAmount: '施術金額',
  isNominated: '指名',
  memo: 'メモ',
};

function formatFieldValue<K extends keyof ReservationSnapshot>(
  key: K,
  value: ReservationSnapshot[K],
): string {
  if (key === 'priceAmount') return formatCurrency(value as number);
  if (key === 'isNominated') return value ? 'あり' : 'なし';
  if (key === 'durationMinutes') return `${String(value)}分`;
  if (key === 'date') return formatDateJP(value as string);
  if (key === 'startTime') return (value as string) || '(未定)';
  const str = String(value);
  return str.trim() === '' ? '(空欄)' : str;
}

/**
 * 変更前(before)と変更後(after)を比較し、変わった項目だけを
 * 「項目名: 変更前 → 変更後」という文字列のリストで返す。
 * 何も変わっていなければ空配列を返す。
 */
export function buildChangeSummary(
  before: ReservationSnapshot,
  after: ReservationSnapshot,
): string[] {
  const keys = Object.keys(FIELD_LABELS) as (keyof ReservationSnapshot)[];
  const changes: string[] = [];

  for (const key of keys) {
    if (before[key] !== after[key]) {
      changes.push(
        `${FIELD_LABELS[key]}: ${formatFieldValue(key, before[key])} → ${formatFieldValue(key, after[key])}`,
      );
    }
  }

  return changes;
}
