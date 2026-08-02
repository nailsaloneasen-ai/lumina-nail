interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
}

/**
 * 画面上部に表示する、引っ張り具合に応じたリフレッシュインジケーター。
 * 引っ張っている間は距離に応じて回転・不透明度が変化し、
 * 更新中はくるくる回るスピナーになる。
 */
export default function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  const opacity = isRefreshing ? 1 : Math.min(pullDistance / 70, 1);
  const rotation = isRefreshing ? 0 : pullDistance * 3;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height]"
      style={{ height: isRefreshing ? 44 : pullDistance }}
    >
      <div
        className={`h-6 w-6 rounded-full border-2 border-lumina-blush border-t-lumina-pink-deep ${
          isRefreshing ? 'animate-spin' : ''
        }`}
        style={{
          opacity,
          transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
        }}
      />
    </div>
  );
}
