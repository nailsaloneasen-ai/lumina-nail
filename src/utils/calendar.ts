import { toDateString } from './format';

/** カレンダーの1マス分の情報 */
export interface CalendarCell {
  /** YYYY-MM-DD */
  date: string;
  /** 表示する日番号 */
  day: number;
  /** 表示中の月に属する日かどうか(前後月の日はfalse) */
  isCurrentMonth: boolean;
}

/**
 * 指定した年月(1〜12)の月表示カレンダー用グリッドを生成する。
 * 日曜始まりで、前後月の日付も含めて7の倍数のマス数になるよう埋める。
 */
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);

  const leadingCount = firstOfMonth.getDay(); // 0(日)〜6(土)
  const totalDaysInMonth = lastOfMonth.getDate();

  const cells: CalendarCell[] = [];

  // 前月の埋め草
  for (let i = leadingCount; i > 0; i -= 1) {
    const date = new Date(year, month - 1, 1 - i);
    cells.push({ date: toDateString(date), day: date.getDate(), isCurrentMonth: false });
  }

  // 当月
  for (let day = 1; day <= totalDaysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    cells.push({ date: toDateString(date), day, isCurrentMonth: true });
  }

  // 翌月の埋め草(7の倍数になるまで)
  const trailingCount = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= trailingCount; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date: toDateString(date), day, isCurrentMonth: false });
  }

  return cells;
}

/** 前月・翌月への年月移動を計算する */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

/** YYYY-MM形式の月キーを生成する(Firestoreクエリの範囲指定に使用) */
export function monthDateRange(
  year: number,
  month: number,
): { start: string; end: string } {
  const start = toDateString(new Date(year, month - 1, 1));
  const end = toDateString(new Date(year, month, 0));
  return { start, end };
}
