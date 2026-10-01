import { describe, expect, it } from 'vitest';
import { validateBackupPayload } from './backup';

describe('validateBackupPayload', () => {
  const base = { version: 1, exportedAt: '2026-10-01T00:00:00.000Z' };

  it('正しい形式のバックアップを受け付ける', () => {
    expect(
      validateBackupPayload({ ...base, reservations: [{ id: 'a' }, { id: 'b' }] }),
    ).toBe(true);
    expect(validateBackupPayload({ ...base, reservations: [] })).toBe(true);
  });

  it('IDが無い・空の予約が含まれていたら拒否する(復元が途中で止まるのを防ぐ)', () => {
    expect(validateBackupPayload({ ...base, reservations: [{ id: 'a' }, {}] })).toBe(
      false,
    );
    expect(validateBackupPayload({ ...base, reservations: [{ id: '' }] })).toBe(false);
    expect(validateBackupPayload({ ...base, reservations: [{ id: 123 }] })).toBe(false);
    expect(validateBackupPayload({ ...base, reservations: [null] })).toBe(false);
  });

  it('設定(通知先・予約媒体)あり・なしの両方を受け付ける(古いバックアップは設定なし)', () => {
    expect(
      validateBackupPayload({
        ...base,
        reservations: [],
        settings: { notifications: { staffEmail: 'a@example.com' } },
      }),
    ).toBe(true);
    expect(validateBackupPayload({ ...base, reservations: [] })).toBe(true);
    expect(validateBackupPayload({ ...base, reservations: [], settings: 'x' })).toBe(
      false,
    );
    expect(validateBackupPayload({ ...base, reservations: [], settings: null })).toBe(
      false,
    );
  });

  it('形式が違うものを拒否する', () => {
    expect(validateBackupPayload(null)).toBe(false);
    expect(validateBackupPayload('text')).toBe(false);
    expect(validateBackupPayload({ ...base, version: 2, reservations: [] })).toBe(false);
    expect(validateBackupPayload({ ...base, reservations: 'x' })).toBe(false);
    expect(validateBackupPayload({ version: 1, reservations: [] })).toBe(false);
  });
});
