import { describe, expect, it } from 'vitest';
import { escapeCsvCell, generateRevenueCsv } from './csvExport';
import type { Reservation } from '../types';

describe('escapeCsvCell', () => {
  it('カンマ・改行・ダブルクォートを含む値は囲んでエスケープする', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
  });

  it("Excelで数式として実行されうる先頭文字(=,+,-,@)の文字列は、先頭に「'」を付けて無効化する", () => {
    expect(escapeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeCsvCell('+81')).toBe("'+81");
    expect(escapeCsvCell('-1')).toBe("'-1");
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
  });

  it('数値は(負の数でも)そのまま出力する', () => {
    expect(escapeCsvCell(8000)).toBe('8000');
    expect(escapeCsvCell(-500)).toBe('-500');
  });

  it('通常の文字列は変更しない', () => {
    expect(escapeCsvCell('山田花子')).toBe('山田花子');
  });
});

describe('generateRevenueCsv', () => {
  it('顧客名が「=」で始まっていても、数式として出力されない', () => {
    const reservation = {
      id: 'x',
      customerName: '=HYPERLINK("http://example.com")',
      date: '2026-07-29',
      startTime: '10:00',
      priceAmount: 8000,
      isNominated: false,
      isPaid: true,
      payment: {
        pointsUsed: 0,
        paidAmount: 8000,
        method: 'cash',
        isRevenueTarget: true,
        paidAt: '',
        paidBy: '',
      },
    } as unknown as Reservation;

    const csv = generateRevenueCsv([reservation]);
    const dataRow = csv.split('\n')[1];
    expect(dataRow.startsWith('2026-07-29,"\'=HYPERLINK(')).toBe(true);
  });
});
