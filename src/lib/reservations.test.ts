import { describe, expect, it } from 'vitest';
import {
  getDayStatus,
  groupReservationsByDate,
  isTimeOverlapping,
  sumTodayRevenue,
} from './reservations';
import type { Reservation } from '../types';

function makeReservation(overrides: Partial<Reservation>): Reservation {
  return {
    id: 'test-id',
    customerName: 'テスト太郎',
    customerKana: '',
    phoneNumber: '',
    date: '2026-07-29',
    startTime: '10:00',
    durationMinutes: 60,
    endTime: '11:00',
    priceAmount: 8000,
    memo: '',
    isNominated: false,
    bookingSource: '',
    payment: null,
    isPaid: false,
    isDeleted: false,
    deletedAt: null,
    createdAt: '',
    createdBy: '',
    updatedAt: '',
    updatedBy: '',
    ...overrides,
  };
}

describe('getDayStatus', () => {
  it('予約が0件、またはundefinedの場合はnone', () => {
    expect(getDayStatus([])).toBe('none');
    expect(getDayStatus(undefined)).toBe('none');
  });

  it('1件でも未会計があればunpaid(全員会計済みでなくても優先してピンク表示)', () => {
    const reservations = [
      makeReservation({ id: '1', isPaid: true }),
      makeReservation({ id: '2', isPaid: false }),
    ];
    expect(getDayStatus(reservations)).toBe('unpaid');
  });

  it('予約が1件以上あり、全員会計済みならpaid', () => {
    const reservations = [
      makeReservation({ id: '1', isPaid: true }),
      makeReservation({ id: '2', isPaid: true }),
    ];
    expect(getDayStatus(reservations)).toBe('paid');
  });
});

describe('groupReservationsByDate', () => {
  it('日付ごとに予約をグルーピングする', () => {
    const reservations = [
      makeReservation({ id: '1', date: '2026-07-29' }),
      makeReservation({ id: '2', date: '2026-07-29' }),
      makeReservation({ id: '3', date: '2026-07-30' }),
    ];

    const grouped = groupReservationsByDate(reservations);

    expect(grouped.get('2026-07-29')).toHaveLength(2);
    expect(grouped.get('2026-07-30')).toHaveLength(1);
    expect(grouped.get('2026-08-01')).toBeUndefined();
  });
});

describe('sumTodayRevenue', () => {
  it('売上画面(summarizeRevenue)と同じく、施術金額(priceAmount)ベースで合算する', () => {
    const reservations = [
      // 施術金額10000円・ポイント1000円使用 → 売上は10000円(ポイント値引きの影響を受けない)
      makeReservation({
        id: '1',
        priceAmount: 10000,
        isPaid: true,
        payment: {
          pointsUsed: 1000,
          paidAmount: 9000,
          method: 'cash',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
      // 未会計 → 集計対象外
      makeReservation({ id: '2', priceAmount: 5000, isPaid: false, payment: null }),
      // 会計済みだが売上対象外 → 集計対象外
      makeReservation({
        id: '3',
        priceAmount: 3000,
        isPaid: true,
        payment: {
          pointsUsed: 0,
          paidAmount: 0,
          method: 'cash',
          isRevenueTarget: false,
          paidAt: '',
          paidBy: '',
        },
      }),
    ];

    expect(sumTodayRevenue(reservations)).toBe(10000);
  });

  it('該当する予約が1件もない場合は0になる', () => {
    expect(sumTodayRevenue([])).toBe(0);
  });
});

describe('isTimeOverlapping(予約時間の重複判定)', () => {
  it('時間帯が重なっていれば重複', () => {
    expect(
      isTimeOverlapping(
        { startTime: '10:00', durationMinutes: 60 },
        { startTime: '10:30', durationMinutes: 60 },
      ),
    ).toBe(true);
  });

  it('ぴったり隣り合う(前の終了=次の開始)は重複としない', () => {
    expect(
      isTimeOverlapping(
        { startTime: '10:00', durationMinutes: 60 },
        { startTime: '11:00', durationMinutes: 60 },
      ),
    ).toBe(false);
  });

  it('深夜0時をまたぐ予約(23:00〜翌0:30)でも、同じ日の23:30開始と重複と判定できる', () => {
    expect(
      isTimeOverlapping(
        { startTime: '23:00', durationMinutes: 90, endTime: '00:30' },
        { startTime: '23:30', durationMinutes: 30 },
      ),
    ).toBe(true);
  });

  it('深夜0時をまたぐ予約でも、離れた時間帯とは重複しない', () => {
    expect(
      isTimeOverlapping(
        { startTime: '23:00', durationMinutes: 90, endTime: '00:30' },
        { startTime: '10:00', durationMinutes: 60 },
      ),
    ).toBe(false);
  });

  it('施術時間が無い古いデータは、終了時刻から時間帯を求める', () => {
    expect(
      isTimeOverlapping(
        { startTime: '10:00', endTime: '11:00' },
        { startTime: '10:30', durationMinutes: 30 },
      ),
    ).toBe(true);
  });

  it('開始時刻が未定の予約は重複判定の対象外', () => {
    expect(
      isTimeOverlapping(
        { startTime: '', durationMinutes: 60 },
        { startTime: '10:00', durationMinutes: 60 },
      ),
    ).toBe(false);
  });
});
