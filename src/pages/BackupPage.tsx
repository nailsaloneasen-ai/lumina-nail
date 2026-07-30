import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  downloadJsonFile,
  exportBackupJson,
  importBackupJson,
  validateBackupPayload,
} from '../lib/backup';
import { todayDateString } from '../utils/format';
import type { BackupPayload } from '../types';

/**
 * バックアップ画面(オーナー専用)
 * -----------------------------------------------------------------------
 * ・JSONエクスポート: 全予約データ(ゴミ箱含む)をJSONファイルとしてダウンロード
 * ・JSONインポート: エクスポートしたJSONファイルを読み込んでFirestoreに復元
 * -----------------------------------------------------------------------
 */
export default function BackupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnline = useOnlineStatus();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [pendingImportPayload, setPendingImportPayload] = useState<BackupPayload | null>(
    null,
  );

  if (user?.role !== 'owner') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-sm text-ink-soft">この画面はオーナーのみ利用できます</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm text-lumina-wisteria"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  async function handleExport() {
    setIsExporting(true);
    setMessage(null);
    try {
      const json = await exportBackupJson();
      downloadJsonFile(json, `lumina-nail-backup-${todayDateString()}.json`);
      setMessage({ type: 'success', text: 'バックアップファイルをダウンロードしました' });
    } catch {
      setMessage({ type: 'error', text: 'エクスポートに失敗しました' });
    } finally {
      setIsExporting(false);
    }
  }

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 同じファイルを連続選択できるようにリセット
    if (!file) return;

    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        if (!validateBackupPayload(parsed)) {
          setMessage({ type: 'error', text: '正しいバックアップファイルではありません' });
          return;
        }
        setPendingImportPayload(parsed);
      } catch {
        setMessage({ type: 'error', text: 'ファイルの読み込みに失敗しました' });
      }
    };
    reader.readAsText(file);
  }

  async function handleConfirmImport() {
    if (!pendingImportPayload) return;
    setIsImporting(true);
    try {
      const count = await importBackupJson(pendingImportPayload);
      setMessage({ type: 'success', text: `${count}件の予約データを復元しました` });
    } catch {
      setMessage({ type: 'error', text: 'インポートに失敗しました' });
    } finally {
      setIsImporting(false);
      setPendingImportPayload(null);
    }
  }

  return (
    <div className="min-h-dvh pb-16">
      <AppHeader title="バックアップ" />

      <main className="px-5 -mt-2 pt-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="text-sm text-lumina-wisteria"
        >
          ← 設定に戻る
        </button>

        {message && (
          <p
            className={`text-sm rounded-lg px-3 py-2 ${
              message.type === 'success'
                ? 'text-status-paid bg-white/70'
                : 'text-lumina-pink-deep bg-lumina-cream'
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="glass-card p-5 space-y-3">
          <p className="text-sm font-medium text-ink">JSONエクスポート</p>
          <p className="text-xs text-ink-soft">
            現在保存されている全予約データ(ゴミ箱含む)をJSONファイルとして書き出します。
          </p>
          <button
            type="button"
            disabled={isExporting || !isOnline}
            onClick={() => void handleExport()}
            className="w-full brand-gradient rounded-xl py-3 text-sm font-medium text-white
                       disabled:opacity-60 active:opacity-90 transition-opacity"
          >
            {isExporting ? '書き出し中…' : 'エクスポートする'}
          </button>
        </div>

        <div className="glass-card p-5 space-y-3">
          <p className="text-sm font-medium text-ink">JSONインポート</p>
          <p className="text-xs text-ink-soft">
            エクスポートしたJSONファイルを読み込み、データを復元します。同じIDの予約は
            上書きされます。
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            type="button"
            disabled={isImporting || !isOnline}
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl py-3 text-sm font-medium text-lumina-wisteria
                       border border-lumina-wisteria/30 disabled:opacity-60
                       active:bg-lumina-blush/40 transition-colors"
          >
            {isImporting ? '復元中…' : 'ファイルを選択して復元する'}
          </button>
        </div>
      </main>

      {pendingImportPayload && (
        <ConfirmDialog
          title="データの復元"
          message={`${pendingImportPayload.reservations.length}件の予約データを復元します。\n同じIDのデータは上書きされます。よろしいですか?`}
          confirmLabel="復元する"
          cancelLabel="キャンセル"
          danger
          onCancel={() => setPendingImportPayload(null)}
          onConfirm={() => void handleConfirmImport()}
        />
      )}
    </div>
  );
}
