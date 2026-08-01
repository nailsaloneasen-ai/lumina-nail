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

/**
 * 指定した日付を含む週(日曜始まり)の7日分のグリッドを生成する。
 * 週表示では「前後月」の概念がないため isCurrentMonth は常にtrueにしている。
 */
export function buildWeekGrid(anchorDate: Date): CalendarCell[] {
  const startOfWeek = new Date(anchorDate);
  startOfWeek.setDate(anchorDate.getDate() - anchorDate.getDay());

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    cells.push({ date: toDateString(date), day: date.getDate(), isCurrentMonth: true });
  }
  return cells;
}

/** 前週・翌週への移動先の基準日を計算する */
export function shiftWeek(anchorDate: Date, delta: number): Date {
  const date = new Date(anchorDate);
  date.setDate(anchorDate.getDate() + delta * 7);
  return date;
}

/** 週の範囲(日曜〜土曜、YYYY-MM-DD)を計算する(Firestoreクエリの範囲指定に使用) */
export function weekDateRange(anchorDate: Date): { start: string; end: string } {
  const startOfWeek = new Date(anchorDate);
  startOfWeek.setDate(anchorDate.getDate() - anchorDate.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return { start: toDateString(startOfWeek), end: toDateString(endOfWeek) };
}

/** 週表示のヘッダーに使う「7月1日 〜 7月7日」のような表示文字列を生成する */
export function formatWeekRangeLabel(anchorDate: Date): string {
  const { start, end } = weekDateRange(anchorDate);
  const [, startMonth, startDay] = start.split('-').map(Number);
  const [, endMonth, endDay] = end.split('-').map(Number);
  return `${startMonth}月${startDay}日 〜 ${endMonth}月${endDay}日`;
}
