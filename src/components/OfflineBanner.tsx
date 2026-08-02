import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * オフライン時に画面上部に表示する案内バナー。
 * 「オフライン時は閲覧のみ可能」という要件を全画面共通で伝える。
 */
export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="no-print sticky top-0 left-0 right-0 z-20 bg-lumina-wisteria text-white text-xs
                 text-center py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]"
    >
      オフラインです。閲覧のみ可能です(保存はオンライン時に行えます)
    </div>
  );
}
