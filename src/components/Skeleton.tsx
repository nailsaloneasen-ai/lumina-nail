/**
 * スケルトン(骨組み)表示コンポーネント群。
 * 「読み込み中…」というテキストの代わりに、実際のコンテンツの形をした
 * 淡いグレーの枠を表示することで、待ち時間の体感を短くする。
 */

/** 汎用の1ブロック分のスケルトン。widthやheightはclassNameで指定する。 */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton-pulse rounded-lg bg-lumina-blush/60 ${className}`} />;
}

/** 予約一覧の1行分に近い形のスケルトン(ReservationListItemの見た目に合わせている) */
export function ReservationListItemSkeleton() {
  return (
    <div className="w-full flex items-center gap-3 rounded-xl bg-white/70 px-4 py-3.5">
      <div className="flex flex-col items-center gap-1 shrink-0 w-14">
        <SkeletonBlock className="h-3.5 w-10" />
        <SkeletonBlock className="h-2.5 w-8" />
      </div>
      <SkeletonBlock className="w-1 self-stretch" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <SkeletonBlock className="h-3.5 w-2/3" />
        <SkeletonBlock className="h-2.5 w-1/3" />
      </div>
      <SkeletonBlock className="h-6 w-14 rounded-full shrink-0" />
    </div>
  );
}

/** 予約一覧が複数件並んでいる状態のスケルトン */
export function ReservationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <ReservationListItemSkeleton key={i} />
      ))}
    </div>
  );
}

/** カード1枚分(数値サマリー等)のスケルトン */
export function SummaryCardSkeleton() {
  return (
    <div className="space-y-2">
      <SkeletonBlock className="h-3 w-20" />
      <SkeletonBlock className="h-8 w-32" />
    </div>
  );
}

/** 予約詳細画面のような、複数の項目が縦に並ぶ形のスケルトン */
export function DetailFieldsSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-5 w-40" />
      <SkeletonBlock className="h-3.5 w-24" />
      <SkeletonBlock className="h-3.5 w-32" />
      <div className="grid grid-cols-3 gap-2">
        <SkeletonBlock className="h-10" />
        <SkeletonBlock className="h-10" />
        <SkeletonBlock className="h-10" />
      </div>
      <SkeletonBlock className="h-7 w-28" />
    </div>
  );
}
