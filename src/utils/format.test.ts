import { describe, expect, it } from 'vitest';
import {
  calculateEndTime,
  formatCurrency,
  formatDateJP,
  formatPhoneNumber,
  toDateString,
} from './format';

describe('calculateEndTime', () => {
  it('通常の時間内であれば単純に加算する', () => {
    expect(calculateEndTime('10:30', 90)).toBe('12:00');
  });

  it('分の繰り上がりを正しく処理する', () => {
    expect(calculateEndTime('09:45', 30)).toBe('10:15');
  });

  it('日をまたぐ場合は0時に折り返す', () => {
    expect(calculateEndTime('23:00', 90)).toBe('00:30');
  });

  it('施術時間0分の場合は開始時間と同じになる', () => {
    expect(calculateEndTime('14:00', 0)).toBe('14:00');
  });
});

describe('formatPhoneNumber', () => {
  it('携帯電話番号(11桁)は3-4-4区切りにする', () => {
    expect(formatPhoneNumber('09012345678')).toBe('090-1234-5678');
  });

  it('東京(03)は2-4-4区切りにする', () => {
    expect(formatPhoneNumber('0312345678')).toBe('03-1234-5678');
  });

  it('大阪(06)は2-4-4区切りにする', () => {
    expect(formatPhoneNumber('0612345678')).toBe('06-1234-5678');
  });

  it('名古屋(052)など3桁市外局番は3-3-4区切りにする', () => {
    expect(formatPhoneNumber('0521234567')).toBe('052-123-4567');
  });

  it('ハイフンや空白が混ざっていても数字だけを見て整形する', () => {
    expect(formatPhoneNumber('090-1234-5678')).toBe('090-1234-5678');
  });

  it('桁数が合わない場合は整形せずそのまま返す', () => {
    expect(formatPhoneNumber('12345')).toBe('12345');
  });
});

describe('formatCurrency', () => {
  it('3桁ごとにカンマを入れて円マークを付ける', () => {
    expect(formatCurrency(8000)).toBe('¥8,000');
    expect(formatCurrency(1234567)).toBe('¥1,234,567');
  });

  it('0円も正しく表示する', () => {
    expect(formatCurrency(0)).toBe('¥0');
  });
});

describe('toDateString / formatDateJP', () => {
  it('DateオブジェクトをYYYY-MM-DD形式に変換する(月・日は0埋め)', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('YYYY-MM-DD文字列を日本語の日付表示に変換する(曜日付き)', () => {
    // 2026-07-29は水曜日
    expect(formatDateJP('2026-07-29')).toBe('2026年7月29日(水)');
  });
});
