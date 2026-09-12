import { describe, expect, it } from 'vitest';
import {
  calculateStaffSalary,
  dateRangeForPeriod,
  filterByNomination,
  filterPaidByMethod,
  filterPointsUsage,
  filterUnpaidReservations,
  summarizeNomination,
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
    isNominated: false,
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
  it('売上は施術金額(priceAmount)ベースで合算し、実受取金額はポイント値引き後(paidAmount)で別集計する', () => {
    const reservations = [
      // 施術金額10000円、ポイント1000円使用 → 売上10000円・実受取9000円
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
      makeReservation({
        id: '2',
        priceAmount: 5000,
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
      // 施術金額3000円、ポイント200円使用 → 売上3000円・実受取2800円
      makeReservation({
        id: '3',
        priceAmount: 3000,
        isPaid: true,
        payment: {
          pointsUsed: 200,
          paidAmount: 2800,
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

    // 売上(施術金額ベース。ポイント値引きの影響を受けない)
    expect(summary.totalRevenue).toBe(18000); // 10000 + 5000 + 3000
    expect(summary.cashRevenue).toBe(10000);
    expect(summary.cardRevenue).toBe(5000);
    expect(summary.emoneyRevenue).toBe(3000);

    // 実受取金額(ポイント値引き後の実際の受取額)
    expect(summary.actualReceivedTotal).toBe(16800); // 9000 + 5000 + 2800
    expect(summary.actualReceivedCash).toBe(9000);
    expect(summary.actualReceivedCard).toBe(5000);
    expect(summary.actualReceivedEmoney).toBe(2800);

    expect(summary.totalPointsUsed).toBe(1200); // 1000 + 0 + 200
    expect(summary.customerCount).toBe(3); // 未会計・売上対象外は含まない
    expect(summary.averageSpend).toBe(6000); // 18000 / 3(施術金額ベースの平均)
  });

  it('該当する予約が1件もない場合は、すべて0になる', () => {
    const summary = summarizeRevenue([]);
    expect(summary.totalRevenue).toBe(0);
    expect(summary.actualReceivedTotal).toBe(0);
    expect(summary.customerCount).toBe(0);
    expect(summary.averageSpend).toBe(0);
  });

  it('平均客単価は小数点以下を四捨五入する', () => {
    const reservations = [
      makeReservation({
        id: '1',
        priceAmount: 1000,
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
        priceAmount: 1000,
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
        priceAmount: 1000,
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
      makeReservation({
        id: 'late',
        date: '2026-07-30',
        startTime: '15:00',
        isPaid: false,
      }),
      makeReservation({
        id: 'paid',
        date: '2026-07-29',
        startTime: '09:00',
        isPaid: true,
      }),
      makeReservation({
        id: 'early',
        date: '2026-07-29',
        startTime: '09:00',
        isPaid: false,
      }),
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

  it('weekは指定日を含む週(日曜〜土曜)になる', () => {
    const base = new Date(2026, 6, 30); // 2026-07-30(木)
    expect(dateRangeForPeriod('week', base)).toEqual({
      start: '2026-07-26', // 日曜
      end: '2026-08-01', // 土曜(翌月にまたぐ)
    });
  });
});

describe('summarizeNomination', () => {
  it('指名の有無ごとに客数・売上(施術金額ベース)・指名率を集計する', () => {
    const reservations = [
      // 施術金額8000円・ポイント利用でpaidAmountは7000円だが、集計には影響しない
      makeReservation({
        id: '1',
        priceAmount: 8000,
        isPaid: true,
        isNominated: true,
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
        priceAmount: 6000,
        isPaid: true,
        isNominated: true,
        payment: {
          pointsUsed: 0,
          paidAmount: 6000,
          method: 'card',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
      makeReservation({
        id: '3',
        priceAmount: 5000,
        isPaid: true,
        isNominated: false,
        payment: {
          pointsUsed: 0,
          paidAmount: 5000,
          method: 'cash',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
      // 未会計 → 集計対象外
      makeReservation({ id: '4', isPaid: false, isNominated: true, payment: null }),
    ];

    const result = summarizeNomination(reservations);

    expect(result.nominatedCount).toBe(2);
    expect(result.nominatedRevenue).toBe(14000); // 8000 + 6000(施術金額ベース)
    expect(result.notNominatedCount).toBe(1);
    expect(result.notNominatedRevenue).toBe(5000);
    // 指名率 = 2 / (2+1) = 66.66...% → 四捨五入で67%
    expect(result.nominationRate).toBe(67);
  });

  it('該当する予約が1件もない場合は指名率0%になる', () => {
    const result = summarizeNomination([]);
    expect(result.nominationRate).toBe(0);
    expect(result.nominatedCount).toBe(0);
    expect(result.notNominatedCount).toBe(0);
  });
});

describe('filterByNomination', () => {
  it('指名ありの予約だけを、日付の新しい順に抽出する', () => {
    const reservations = [
      makeReservation({
        id: 'nominated-old',
        date: '2026-07-01',
        isPaid: true,
        isNominated: true,
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
        id: 'nominated-new',
        date: '2026-07-15',
        isPaid: true,
        isNominated: true,
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
        id: 'not-nominated',
        date: '2026-07-10',
        isPaid: true,
        isNominated: false,
        payment: {
          pointsUsed: 0,
          paidAmount: 3000,
          method: 'cash',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
    ];

    const result = filterByNomination(reservations, true);

    expect(result.map((r) => r.id)).toEqual(['nominated-new', 'nominated-old']);
  });
});

describe('calculateStaffSalary', () => {
  it('売上の半分を税抜きに変換(1円未満切り上げ)し、指名1件500円を人数分加算する', () => {
    const reservations = [
      // 施術金額100,000円、指名2件(500円×2=1000円のボーナス対象)
      makeReservation({
        id: '1',
        priceAmount: 60000,
        isPaid: true,
        isNominated: true,
        payment: {
          pointsUsed: 0,
          paidAmount: 60000,
          method: 'cash',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
      makeReservation({
        id: '2',
        priceAmount: 40000,
        isPaid: true,
        isNominated: true,
        payment: {
          pointsUsed: 0,
          paidAmount: 40000,
          method: 'card',
          isRevenueTarget: true,
          paidAt: '',
          paidBy: '',
        },
      }),
    ];

    const result = calculateStaffSalary(reservations);

    // revenue = 100,000円 → half = 50,000円
    // taxExcludedHalf = ceil(50,000 / 1.1) = ceil(45,454.54...) = 45,455円
    // nominationBonus = 2 × 500 = 1,000円
    // salary = 45,455 + 1,000 = 46,455円
    expect(result.revenue).toBe(100000);
    expect(result.half).toBe(50000);
    expect(result.taxExcludedHalf).toBe(45455);
    expect(result.nominatedCount).toBe(2);
    expect(result.nominationBonus).toBe(1000);
    expect(result.salary).toBe(46455);
  });

  it('該当する予約が1件もない場合は、すべて0になる', () => {
    const result = calculateStaffSalary([]);
    expect(result.revenue).toBe(0);
    expect(result.half).toBe(0);
    expect(result.taxExcludedHalf).toBe(0);
    expect(result.nominatedCount).toBe(0);
    expect(result.nominationBonus).toBe(0);
    expect(result.salary).toBe(0);
  });
});
