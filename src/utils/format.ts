/**
 * 表示整形ユーティリティ
 * -----------------------------------------------------------------------
 * 金額・日付・電話番号など、アプリ全体で繰り返し使う整形処理をまとめる。
 * -----------------------------------------------------------------------
 */

/** 今日の日付を YYYY-MM-DD 形式で取得する(ローカルタイムゾーン基準) */
export function todayDateString(): string {
  return toDateString(new Date());
}

/** DateオブジェクトをYYYY-MM-DD形式の文字列に変換する */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** YYYY-MM-DD形式の文字列を「2026年7月28日(火)」のような日本語表示に変換する */
export function formatDateJP(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${year}年${month}月${day}日(${weekday})`;
}

/** 金額(数値)を「¥8,000」形式に整形する */
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

/**
 * 電話番号の数字のみの入力を「090-1234-5678」のようなハイフン区切りに整形する。
 * 携帯番号(11桁)・固定電話(10桁)の一般的なパターンに対応する。
 */
/** 2桁の市外局番を持つ主要都市(東京・大阪) */
const TWO_DIGIT_AREA_CODES = ['03', '06'];

/**
 * 電話番号の数字のみの入力を「090-1234-5678」のようなハイフン区切りに整形する。
 * 携帯番号(11桁)は3-4-4区切り。固定電話(10桁)は、東京(03)・大阪(06)の
 * 2桁市外局番は2-4-4区切り、それ以外(名古屋の052など3桁市外局番が大半)は
 * 3-3-4区切りで表示する。
 *
 * 【注意】日本の市外局番は2〜5桁までさまざまで、正確な区切り位置は総務省の
 * 市外局番一覧を参照しないと完全には判定できない。ここでは主要2都市のみ
 * 特別対応し、その他は3桁市外局番として扱う簡易実装としている。
 */
export function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 11) {
    // 携帯電話: 090-1234-5678
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    const twoDigitPrefix = digits.slice(0, 2);
    if (TWO_DIGIT_AREA_CODES.includes(twoDigitPrefix)) {
      // 東京(03)・大阪(06): 03-1234-5678
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    // その他(名古屋の052など3桁市外局番が大半): 052-123-4567
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // 桁数が合わない場合は整形せずそのまま返す(入力途中の可能性があるため)
  return digits;
}

/**
 * 開始時刻(HH:mm)と施術時間(分)から終了時刻(HH:mm)を自動計算する。
 * 日をまたぐ場合は考慮しない(営業時間内の利用を想定)。
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}
