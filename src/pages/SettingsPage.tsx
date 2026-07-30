import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';

/**
 * 設定画面(オーナー専用)
 * -----------------------------------------------------------------------
 * パスワード変更・バックアップ(JSONエクスポート/インポート)・ゴミ箱への
 * 入口をまとめたハブ画面。
 * -----------------------------------------------------------------------
 */
export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role !== 'owner') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-sm text-ink-soft">この画面はオーナーのみ閲覧できます</p>
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

  const menuItems = [
    {
      label: 'パスワード変更',
      description: 'ログイン中のアカウントのパスワードを変更します',
      to: '/settings/password',
    },
    {
      label: 'バックアップ',
      description: '予約データのJSONエクスポート・インポート',
      to: '/settings/backup',
    },
    {
      label: 'ゴミ箱',
      description: '削除した予約の確認・復元(30日で自動削除)',
      to: '/settings/trash',
    },
  ];

  return (
    <div className="min-h-dvh pb-24">
      <AppHeader title="設定" />

      <main className="px-5 -mt-2 pt-6 space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.to}
            type="button"
            onClick={() => navigate(item.to)}
            className="glass-card w-full p-4 text-left flex items-center justify-between
                       active:bg-lumina-blush/30 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-ink">{item.label}</p>
              <p className="text-xs text-ink-soft mt-0.5">{item.description}</p>
            </div>
            <span className="text-lumina-wisteria">›</span>
          </button>
        ))}
      </main>

      <BottomNav />
    </div>
  );
}
