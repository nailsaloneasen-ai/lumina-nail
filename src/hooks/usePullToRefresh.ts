import { useRef, useState, type TouchEvent } from 'react';

const PULL_THRESHOLD = 70; // これ以上引っ張ったら更新とみなす距離(px)
const MAX_PULL = 100; // インジケーターが動く最大距離(px)

interface UsePullToRefreshResult {
  /** 引っ張っている最中の距離(px)。インジケーターの表示位置に使う。 */
  pullDistance: number;
  /** 更新処理を実行中かどうか */
  isRefreshing: boolean;
  touchHandlers: {
    onTouchStart: (e: TouchEvent<HTMLDivElement>) => void;
    onTouchMove: (e: TouchEvent<HTMLDivElement>) => void;
    onTouchEnd: () => void;
  };
}

/**
 * 画面を下に引っ張って更新する(pull-to-refresh)ジェスチャーを扱うフック。
 *
 * このアプリのデータはFirestoreのリアルタイム購読で既に自動更新されているため、
 * 厳密には「引っ張らないと最新化されない」わけではない。それでも、
 * ユーザーが能動的に「更新した」という手応えを得られるように、
 * 短い待機とトースト通知を伴う演出として提供している。
 */
export function usePullToRefresh(onRefresh: () => void): UsePullToRefreshResult {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const isAtTopRef = useRef(true);

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    // ページの一番上にスクロールされている時だけ、プルリフレッシュを有効にする
    isAtTopRef.current = window.scrollY <= 0;
    if (isAtTopRef.current) {
      startYRef.current = e.touches[0].clientY;
    }
  }

  function onTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (!isAtTopRef.current || startYRef.current === null || isRefreshing) return;

    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, MAX_PULL));
    }
  }

  function onTouchEnd() {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      onRefresh();
      // データ自体はリアルタイム購読で既に最新のため、演出として少し待ってから閉じる
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 700);
    } else {
      setPullDistance(0);
    }
    startYRef.current = null;
  }

  return {
    pullDistance,
    isRefreshing,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
