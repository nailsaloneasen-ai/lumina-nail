import { useEffect, useState } from 'react';

/**
 * ブラウザのオンライン/オフライン状態を検知するフック。
 *
 * 要件「オフライン時は閲覧のみ可能(同期はオンライン時)」に対応するため、
 * 各画面の保存・削除・復元などの書き込み操作の可否判定に使用する。
 * 読み取り(閲覧)はFirestoreのオフラインキャッシュ(persistentLocalCache)により
 * オフラインでも可能。
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
