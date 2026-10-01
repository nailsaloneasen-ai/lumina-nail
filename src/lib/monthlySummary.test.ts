import { describe, expect, it } from 'vitest';
import { SUMMARY_DEFER_UNTIL_DAY, shouldDeferMonthlySummary } from './monthlySummary';

describe('shouldDeferMonthlySummary(未会計が残る間の送信見送り)', () => {
  const allPaid = [{ isPaid: true }, { isPaid: true }];
  const someUnpaid = [{ isPaid: true }, { isPaid: false }];

  it('前月分がすべて会計済みなら、月初でも見送らない', () => {
    expect(shouldDeferMonthlySummary(allPaid, new Date(2026, 9, 1))).toBe(false);
  });

  it('予約が0件なら見送らない', () => {
    expect(shouldDeferMonthlySummary([], new Date(2026, 9, 1))).toBe(false);
  });

  it('未会計が残っていて猶予期間内(月初)なら見送る', () => {
    expect(shouldDeferMonthlySummary(someUnpaid, new Date(2026, 9, 1))).toBe(true);
    expect(
      shouldDeferMonthlySummary(
        someUnpaid,
        new Date(2026, 9, SUMMARY_DEFER_UNTIL_DAY - 1),
      ),
    ).toBe(true);
  });

  it('猶予期間を過ぎたら、未会計が残っていても送る(会計の入れ忘れで永久に届かないのを防ぐ)', () => {
    expect(
      shouldDeferMonthlySummary(someUnpaid, new Date(2026, 9, SUMMARY_DEFER_UNTIL_DAY)),
    ).toBe(false);
    expect(shouldDeferMonthlySummary(someUnpaid, new Date(2026, 9, 25))).toBe(false);
  });
});
