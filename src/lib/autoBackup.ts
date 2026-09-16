/**
 * Google Driveへの自動バックアップ
 * -----------------------------------------------------------------------
 * オーナーがアプリを開いたタイミングで、前回の自動バックアップから
 * 一定時間(20時間)以上経っていれば、その時点の全データ(バックアップ機能と
 * 同じJSON)をGoogle Apps Script経由でGoogle Driveに保存する。
 *
 * - スタッフのログイン時は実行しない(オーナーのみ)
 * - 「アプリを開いたら毎回」ではなく、1日1回程度に抑えるため、
 *   直近の実行時刻をFirestore(settings/backup)に記録して間隔を判定する
 * - 通知メールと同様、送信結果(成功したか)はアプリ側では確認できない
 *   (Apps Script側の仕様上、レスポンスを読み取れないため)。そのため
 *   「送信を試みた時刻」を記録する、という割り切った作りにしている
 * -----------------------------------------------------------------------
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { exportBackupJson } from './backup';
import { NOTIFY_SECRET, NOTIFY_WEBAPP_URL } from './notifyConfig';

const BACKUP_SETTINGS_DOC_ID = 'backup';
const MIN_INTERVAL_HOURS = 20;

function backupSettingsDocRef() {
  return doc(db, 'settings', BACKUP_SETTINGS_DOC_ID);
}

async function getLastAutoBackupAt(): Promise<string | null> {
  const snapshot = await getDoc(backupSettingsDocRef());
  const data = snapshot.data();
  return (data?.lastAutoBackupAt as string | undefined) ?? null;
}

function isDue(lastAutoBackupAt: string | null): boolean {
  if (!lastAutoBackupAt) return true;
  const elapsedHours =
    (Date.now() - new Date(lastAutoBackupAt).getTime()) / (1000 * 60 * 60);
  return elapsedHours >= MIN_INTERVAL_HOURS;
}

/**
 * アプリを開いたタイミングで呼び出す。
 * 前回の自動バックアップから一定時間経っていなければ何もしない。
 */
export async function runAutoBackupIfDue(): Promise<void> {
  if (!NOTIFY_WEBAPP_URL) return; // Apps Script未設置の間は何もしない

  try {
    const lastAutoBackupAt = await getLastAutoBackupAt();
    if (!isDue(lastAutoBackupAt)) return;

    const backupJson = await exportBackupJson();

    // 送信結果を確認できないため、「試みた時刻」を先に記録しておく
    // (これにより、通信が不安定な環境で毎回リトライし続けることも防げる)
    await setDoc(
      backupSettingsDocRef(),
      { lastAutoBackupAt: new Date().toISOString() },
      { merge: true },
    );

    await fetch(NOTIFY_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        secret: NOTIFY_SECRET,
        type: 'backup',
        backupJson,
      }),
    });
  } catch (err) {
    console.error('自動バックアップに失敗しました', err);
  }
}
