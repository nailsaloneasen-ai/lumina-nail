import { describe, expect, it } from 'vitest';
import {
  buildMonthGrid,
  buildWeekGrid,
  formatWeekRangeLabel,
  monthDateRange,
  shiftMonth,
  shiftWeek,
  weekDateRange,
} from './calendar';

describe('buildMonthGrid', () => {
  it('マス数は必ず7の倍数になる', () => {
    const grid = buildMonthGrid(2026, 7);
    expect(grid.length % 7).toBe(0);
  });

  it('当月の日付はisCurrentMonthがtrueになる', () => {
    const grid = buildMonthGrid(2026, 7);
    const july1 = grid.find((c) => c.date === '2026-07-01');
    expect(july1?.isCurrentMonth).toBe(true);
  });

  it('前後月の埋め草はisCurrentMonthがfalseになる', () => {
    const grid = buildMonthGrid(2026, 7);
    const firstCell = grid[0];
    const lastCell = grid[grid.length - 1];
    // 2026年7月1日は水曜日なので、前月(6月)の日が埋め草として入る
    expect(firstCell.isCurrentMonth).toBe(false);
    expect(lastCell.isCurrentMonth).toBe(false);
  });

  it('2月(うるう年でない)は28日まで正しく生成される', () => {
    const grid = buildMonthGrid(2026, 2);
    const currentMonthDays = grid.filter((c) => c.isCurrentMonth);
    expect(currentMonthDays.length).toBe(28);
    expect(currentMonthDays[currentMonthDays.length - 1].date).toBe('2026-02-28');
  });
});

describe('buildWeekGrid', () => {
  it('必ず7日分(日曜始まり)のグリッドを返す', () => {
    const grid = buildWeekGrid(new Date(2026, 6, 30)); // 2026-07-30(木)
    expect(grid).toHaveLength(7);
    expect(grid[0].date).toBe('2026-07-26'); // 直前の日曜日
    expect(grid[6].date).toBe('2026-08-01'); // 直後の土曜日
  });

  it('週表示ではisCurrentMonthは常にtrue扱いにする', () => {
    const grid = buildWeekGrid(new Date(2026, 6, 30));
    expect(grid.every((c) => c.isCurrentMonth)).toBe(true);
  });
});

describe('shiftMonth / shiftWeek', () => {
  it('年をまたぐ月移動を正しく計算する(12月→翌年1月)', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('年をまたぐ月移動を正しく計算する(1月→前年12月)', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('週移動は7日単位で加減算する', () => {
    const base = new Date(2026, 6, 30);
    const nextWeek = shiftWeek(base, 1);
    expect(toYmd(nextWeek)).toBe('2026-08-06');

    const prevWeek = shiftWeek(base, -1);
    expect(toYmd(prevWeek)).toBe('2026-07-23');
  });
});

describe('monthDateRange / weekDateRange', () => {
  it('月の範囲は1日〜末日になる', () => {
    expect(monthDateRange(2026, 7)).toEqual({ start: '2026-07-01', end: '2026-07-31' });
  });

  it('週の範囲は日曜〜土曜になる', () => {
    expect(weekDateRange(new Date(2026, 6, 30))).toEqual({
      start: '2026-07-26',
      end: '2026-08-01',
    });
  });
});

describe('formatWeekRangeLabel', () => {
  it('「◯月◯日 〜 ◯月◯日」の形式で表示する', () => {
    expect(formatWeekRangeLabel(new Date(2026, 6, 30))).toBe('7月26日 〜 8月1日');
  });
});

/** テスト内でDateを比較しやすくするための簡易ヘルパー */
function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
