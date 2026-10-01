import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { BackupPayload, Reservation } from '../types';

const RESERVATIONS_COLLECTION = 'reservations';
const SETTINGS_COLLECTION = 'settings';

/** バックアップに含める設定ドキュメント(settings/<ID>)。
 *  backup(最終バックアップ日時)やmonthlySummary(送信済み月)は運用上の記録なので含めない */
const BACKUP_SETTING_KEYS = ['notifications', 'bookingSources'] as const;

/**
 * バックアップ(JSONエクスポート/インポート)ロジック
 * -----------------------------------------------------------------------
 * オーナーのみが利用可能。全予約データ(ゴミ箱含む・過去データ含む)を
 * JSON形式で書き出し・読み込みする。
 * -----------------------------------------------------------------------
 */

/**
 * 全予約データ(削除済み含む)を取得し、バックアップ用JSON文字列を生成する。
 *
 * 端末のキャッシュ(過去に開いた予約だけが入っている不完全なデータ)から
 * バックアップが作られてしまうのを防ぐため、必ずサーバーから取得する。
 * 通信できない場合はエラーになる(「一部しか入っていないバックアップ」より、
 * 失敗してやり直せる方が安全なため)。
 */
export async function exportBackupJson(): Promise<string> {
  const snapshot = await getDocsFromServer(collection(db, RESERVATIONS_COLLECTION));
  const reservations = snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Reservation,
  );

  // 設定(通知先メールアドレス・予約媒体の選択肢)も一緒に保存する。
  // 復元したときに、設定をもう一度入力し直さなくて済むようにするため。
  const settings: NonNullable<BackupPayload['settings']> = {};
  for (const key of BACKUP_SETTING_KEYS) {
    const settingSnapshot = await getDocFromServer(doc(db, SETTINGS_COLLECTION, key));
    if (settingSnapshot.exists()) {
      settings[key] = settingSnapshot.data();
    }
  }

  const payload: BackupPayload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    reservations,
    settings,
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
    Array.isArray(payload.reservations) &&
    // 各予約にIDが無いと復元時にエラーで止まる(途中まで復元された中途半端な状態になる)ため、
    // 復元を始める前に全件のIDと形式を確認する
    payload.reservations.every(
      (r) =>
        typeof r === 'object' &&
        r !== null &&
        typeof (r as { id?: unknown }).id === 'string' &&
        (r as { id: string }).id !== '',
    ) &&
    // 設定は省略可能(古いバックアップには無い)。あるなら、オブジェクトであること
    (payload.settings === undefined ||
      (typeof payload.settings === 'object' && payload.settings !== null))
  );
}

/**
 * バックアップJSONをFirestoreに書き戻す(復元)。
 * 同じIDの予約が既に存在する場合は上書きする(merge)。
 * バックアップに設定(通知先・予約媒体)が含まれていれば、それも書き戻す。
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

  if (payload.settings) {
    const settingsBatch = writeBatch(db);
    for (const key of BACKUP_SETTING_KEYS) {
      const data = payload.settings[key];
      if (data && typeof data === 'object') {
        settingsBatch.set(doc(db, SETTINGS_COLLECTION, key), data, { merge: true });
      }
    }
    await settingsBatch.commit();
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
