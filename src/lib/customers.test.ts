import { describe, expect, it } from 'vitest';
import { filterCustomerSuggestions, type CustomerSuggestion } from './customers';

const SUGGESTIONS: CustomerSuggestion[] = [
  {
    customerName: '田中花子',
    customerKana: 'タナカハナコ',
    phoneNumber: '09011112222',
    canceledCount: 0,
    noShowCount: 0,
  },
  {
    customerName: '田村太郎',
    customerKana: 'タムラタロウ',
    phoneNumber: '09033334444',
    canceledCount: 0,
    noShowCount: 0,
  },
  {
    customerName: '高橋みゆき',
    customerKana: 'タカハシミユキ',
    phoneNumber: '',
    canceledCount: 0,
    noShowCount: 0,
  },
];

describe('filterCustomerSuggestions', () => {
  it('入力が空なら候補を返さない', () => {
    expect(filterCustomerSuggestions(SUGGESTIONS, '')).toEqual([]);
    expect(filterCustomerSuggestions(SUGGESTIONS, '   ')).toEqual([]);
  });

  it('名前の先頭一致で候補を絞り込む', () => {
    const result = filterCustomerSuggestions(SUGGESTIONS, '田');
    expect(result.map((s) => s.customerName)).toEqual(['田中花子', '田村太郎']);
  });

  it('先頭一致しない(途中の文字列)場合は候補に含めない', () => {
    // 「花子」は「田中花子」の途中の文字列なので、先頭一致検索ではヒットしない
    const result = filterCustomerSuggestions(SUGGESTIONS, '花子');
    expect(result).toEqual([]);
  });

  it('maxResultsで件数を絞れる', () => {
    const result = filterCustomerSuggestions(SUGGESTIONS, '田', 1);
    expect(result).toHaveLength(1);
    expect(result[0].customerName).toBe('田中花子');
  });
});
