import { describe, expect, it } from 'vitest';
import {
  activeReservations,
  canMarkCancelled,
  countCancellations,
  formatCancellationCounts,
  isCancelled,
} from './cancellation';

describe('isCancelled', () => {
  it('キャンセル・無断キャンセルはtrue', () => {
    expect(isCancelled({ cancelStatus: 'canceled' })).toBe(true);
    expect(isCancelled({ cancelStatus: 'no_show' })).toBe(true);
  });

  it('通常の予約(未設定・null)はfalse。古いデータ(項目なし)も通常の予約として扱う', () => {
    expect(isCancelled({})).toBe(false);
    expect(isCancelled({ cancelStatus: null })).toBe(false);
  });
});

describe('activeReservations', () => {
  it('キャンセルされた予約を除く', () => {
    const list = [
      { id: 'a' },
      { id: 'b', cancelStatus: 'canceled' as const },
      { id: 'c', cancelStatus: null },
      { id: 'd', cancelStatus: 'no_show' as const },
    ];
    expect(activeReservations(list).map((r) => r.id)).toEqual(['a', 'c']);
  });
});

describe('canMarkCancelled', () => {
  it('未会計の通常の予約はキャンセルにできる', () => {
    expect(canMarkCancelled({ isPaid: false })).toBe(true);
  });

  it('会計済みの予約はキャンセルにできない(売上に入っているため)', () => {
    expect(canMarkCancelled({ isPaid: true })).toBe(false);
  });

  it('すでにキャンセル済みの予約は対象外', () => {
    expect(canMarkCancelled({ isPaid: false, cancelStatus: 'canceled' })).toBe(false);
  });
});

describe('countCancellations / formatCancellationCounts', () => {
  it('キャンセルと無断キャンセルを別々に数える', () => {
    const counts = countCancellations([
      { cancelStatus: 'canceled' },
      { cancelStatus: 'canceled' },
      { cancelStatus: 'no_show' },
      { cancelStatus: null },
      {},
    ]);
    expect(counts).toEqual({ canceled: 2, noShow: 1 });
  });

  it('表示文字列を作る(回数が0の種類は出さない)', () => {
    expect(formatCancellationCounts({ canceled: 2, noShow: 1 })).toBe(
      'キャンセル2回・無断キャンセル1回',
    );
    expect(formatCancellationCounts({ canceled: 0, noShow: 3 })).toBe(
      '無断キャンセル3回',
    );
    expect(formatCancellationCounts({ canceled: 1, noShow: 0 })).toBe('キャンセル1回');
  });

  it('どちらも0回ならnull(何も表示しない)', () => {
    expect(formatCancellationCounts({ canceled: 0, noShow: 0 })).toBeNull();
  });
});
