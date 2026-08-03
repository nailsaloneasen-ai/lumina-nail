import { describe, expect, it } from 'vitest';
import { getDayStatus, groupReservationsByDate } from './reservations';
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
