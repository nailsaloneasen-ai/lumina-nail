import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { BackupPayload, Reservation } from '../types';

const RESERVATIONS_COLLECTION = 'reservations';

/**
 * バックアップ(JSONエクスポート/インポート)ロジック
 * -----------------------------------------------------------------------
 * オーナーのみが利用可能。全予約データ(ゴミ箱含む・過去データ含む)を
 * JSON形式で書き出し・読み込みする。
 * -----------------------------------------------------------------------
 */

/** 全予約データ(削除済み含む)を取得し、バックアップ用JSON文字列を生成する */
export async function exportBackupJson(): Promise<string> {
  const snapshot = await getDocs(collection(db, RESERVATIONS_COLLECTION));
  const reservations = snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Reservation,
  );

  const payload: BackupPayload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    reservations,
  };

  return JSON.stringify(payload, null, 2);
}

/** バックアップJSON文字列の形式を検証する(壊れたファイルの読み込みを防ぐ) */
export function validateBackupPayload(json: unknown): json is BackupPayload {
  if (typeof json !== 'object' || json === null) return false;
  const payload = json as Partial<BackupPayload>;
  return (
    payload.version === 1 &&
    typeof payload.exportedAt === 'string' &&
    Array.isArray(payload.reservations)
  );
}

/**
 * バックアップJSONをFirestoreに書き戻す(復元)。
 * 同じIDの予約が既に存在する場合は上書きする(merge)。
 * Firestoreのバッチ書き込みは1回あたり最大500件のため、500件ごとに分割する。
 */
export async function importBackupJson(payload: BackupPayload): Promise<number> {
  const BATCH_LIMIT = 500;
  const { reservations } = payload;

  for (let i = 0; i < reservations.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = reservations.slice(i, i + BATCH_LIMIT);

    for (const reservation of chunk) {
      const { id, ...data } = reservation;
      batch.set(doc(db, RESERVATIONS_COLLECTION, id), data, { merge: true });
    }

    await batch.commit();
  }

  return reservations.length;
}

/** ブラウザ上でJSON文字列をファイルとしてダウンロードさせる */
export function downloadJsonFile(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
