import { describe, expect, it } from 'vitest';
import { buildChangeSummary, type ReservationSnapshot } from './reservationDiff';

function makeSnapshot(overrides: Partial<ReservationSnapshot> = {}): ReservationSnapshot {
  return {
    date: '2026-09-10',
    startTime: '10:00',
    durationMinutes: 60,
    customerName: '山田花子',
    customerKana: 'ヤマダハナコ',
    phoneDigits: '09012345678',
    priceAmount: 8000,
    isNominated: false,
    memo: '',
    ...overrides,
  };
}

describe('buildChangeSummary', () => {
  it('変更がない場合は空配列を返す', () => {
    const snapshot = makeSnapshot();
    expect(buildChangeSummary(snapshot, { ...snapshot })).toEqual([]);
  });

  it('変わった項目だけを「項目名: 変更前 → 変更後」の形式で返す', () => {
    const before = makeSnapshot({ priceAmount: 8000, isNominated: false });
    const after = makeSnapshot({ priceAmount: 9000, isNominated: true });

    const changes = buildChangeSummary(before, after);

    expect(changes).toEqual([
      expect.stringContaining('施術金額: ¥8,000 → ¥9,000'),
      expect.stringContaining('指名: なし → あり'),
    ]);
    // 変わっていない項目(お客様名など)は含まれない
    expect(changes.some((c) => c.startsWith('お客様名'))).toBe(false);
  });

  it('空欄になった項目は「(空欄)」と表示する', () => {
    const before = makeSnapshot({ memo: '前髪に注意' });
    const after = makeSnapshot({ memo: '' });

    const changes = buildChangeSummary(before, after);

    expect(changes).toEqual(['メモ: 前髪に注意 → (空欄)']);
  });

  it('開始時間が未定(空文字)になった場合は「(未定)」と表示する', () => {
    const before = makeSnapshot({ startTime: '10:00' });
    const after = makeSnapshot({ startTime: '' });

    const changes = buildChangeSummary(before, after);

    expect(changes).toEqual(['開始時間: 10:00 → (未定)']);
  });
});
