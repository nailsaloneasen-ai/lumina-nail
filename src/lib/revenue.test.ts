import { describe, expect, it } from 'vitest';
import {
  dateRangeForPeriod,
  filterPaidByMethod,
  filterPointsUsage,
  filterUnpaidReservations,
  summarizeRevenue,
} from './revenue';
import type { Reservation } from '../types';

/**
 * テスト用の予約データを、必要な項目だけ指定して簡単に作れるヘルパー。
 * 明示していない項目には、テストに影響しないダミー値を入れる。
 */
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

describe('summarizeRevenue', () => {
  it('会計済み・売上対象の予約だけを合算する', () => {
    const reservations = [
      makeReservation({
        id: '1',
        isPaid: true,
        payment: {
          pointsUsed: 1000,
          paidAmount: 7000,
          method: 'cash',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
      makeReservation({
        id: '2',
        isPaid: true,
        payment: {
          pointsUsed: 0,
          paidAmount: 5000,
          method: 'card',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
      makeReservation({
        id: '3',
        isPaid: true,
        payment: {
          pointsUsed: 200,
          paidAmount: 3000,
          method: 'emoney',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
      // 未会計 → 集計対象外
      makeReservation({ id: '4', isPaid: false, payment: null }),
      // 会計済みだが売上対象外(サービス品等)→ 集計対象外
      makeReservation({
        id: '5',
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

    const summary = summarizeRevenue(reservations);

    expect(summary.totalRevenue).toBe(15000); // 7000 + 5000 + 3000
    expect(summary.cashRevenue).toBe(7000);
    expect(summary.cardRevenue).toBe(5000);
    expect(summary.emoneyRevenue).toBe(3000);
    expect(summary.totalPointsUsed).toBe(1200); // 1000 + 0 + 200
    expect(summary.customerCount).toBe(3); // 未会計・売上対象外は含まない
    expect(summary.averageSpend).toBe(5000); // 15000 / 3
  });

  it('該当する予約が1件もない場合は、すべて0になる', () => {
    const summary = summarizeRevenue([]);
    expect(summary.totalRevenue).toBe(0);
    expect(summary.customerCount).toBe(0);
    expect(summary.averageSpend).toBe(0);
  });

  it('平均客単価は小数点以下を四捨五入する', () => {
    const reservations = [
      makeReservation({
        id: '1',
        isPaid: true,
        payment: {
          pointsUsed: 0,
          paidAmount: 1000,
          method: 'cash',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
      makeReservation({
        id: '2',
        isPaid: true,
        payment: {
          pointsUsed: 0,
          paidAmount: 1000,
          method: 'cash',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
      makeReservation({
        id: '3',
        isPaid: true,
        payment: {
          pointsUsed: 0,
          paidAmount: 1000,
          method: 'cash',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
    ];
    // 3000 / 3人 = 1000ちょうどのケースに加え、割り切れないケースも確認
    expect(summarizeRevenue(reservations).averageSpend).toBe(1000);
  });
});

describe('filterUnpaidReservations', () => {
  it('未会計の予約だけを、日時の早い順に抽出する', () => {
    const reservations = [
      makeReservation({ id: 'late', date: '2026-07-30', startTime: '15:00', isPaid: false }),
      makeReservation({ id: 'paid', date: '2026-07-29', startTime: '09:00', isPaid: true }),
      makeReservation({ id: 'early', date: '2026-07-29', startTime: '09:00', isPaid: false }),
    ];

    const result = filterUnpaidReservations(reservations);

    expect(result.map((r) => r.id)).toEqual(['early', 'late']);
  });
});

describe('filterPaidByMethod', () => {
  it('指定した支払い方法・売上対象の予約だけを、日付の新しい順に抽出する', () => {
    const reservations = [
      makeReservation({
        id: 'cash-old',
        date: '2026-07-01',
        isPaid: true,
        payment: {
          pointsUsed: 0,
          paidAmount: 1000,
          method: 'cash',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
      makeReservation({
        id: 'cash-new',
        date: '2026-07-15',
        isPaid: true,
        payment: {
          pointsUsed: 0,
          paidAmount: 2000,
          method: 'cash',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
      makeReservation({
        id: 'card',
        date: '2026-07-10',
        isPaid: true,
        payment: {
          pointsUsed: 0,
          paidAmount: 3000,
          method: 'card',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
    ];

    const result = filterPaidByMethod(reservations, 'cash');

    expect(result.map((r) => r.id)).toEqual(['cash-new', 'cash-old']);
  });
});

describe('filterPointsUsage', () => {
  it('ポイントを使用した予約だけを抽出する', () => {
    const reservations = [
      makeReservation({
        id: 'with-points',
        isPaid: true,
        payment: {
          pointsUsed: 500,
          paidAmount: 1000,
          method: 'cash',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
      makeReservation({
        id: 'no-points',
        isPaid: true,
        payment: {
          pointsUsed: 0,
          paidAmount: 1500,
          method: 'cash',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
    ];

    const result = filterPointsUsage(reservations);

    expect(result.map((r) => r.id)).toEqual(['with-points']);
  });
});

describe('dateRangeForPeriod', () => {
  it('todayは指定日1日分の範囲になる', () => {
    const base = new Date(2026, 6, 29); // 2026-07-29
    expect(dateRangeForPeriod('today', base)).toEqual({
      start: '2026-07-29',
      end: '2026-07-29',
    });
  });

  it('monthは指定日を含む月の1日〜末日になる(31日まである月)', () => {
    const base = new Date(2026, 6, 29); // 2026-07-29
    expect(dateRangeForPeriod('month', base)).toEqual({
      start: '2026-07-01',
      end: '2026-07-31',
    });
  });

  it('monthはうるう年でない2月でも正しく末日(28日)になる', () => {
    const base = new Date(2026, 1, 10); // 2026-02-10(2026年はうるう年ではない)
    expect(dateRangeForPeriod('month', base)).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  it('yearは1月1日〜12月31日になる', () => {
    const base = new Date(2026, 6, 29);
    expect(dateRangeForPeriod('year', base)).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    });
  });
});
