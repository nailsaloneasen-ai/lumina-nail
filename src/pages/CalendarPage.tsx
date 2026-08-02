import { useRef, useState, type TouchEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import { useToast } from '../contexts/ToastContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useReservationsInRange } from '../hooks/useReservationsInRange';
import {
  buildMonthGrid,
  buildWeekGrid,
  formatWeekRangeLabel,
  monthDateRange,
  shiftMonth,
  shiftWeek,
  weekDateRange,
} from '../utils/calendar';
import { getDayStatus } from '../lib/reservations';
import { todayDateString } from '../utils/format';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/** 左右スワイプと判定する最小移動距離(px)。これより小さい動きは無視する。 */
const SWIPE_THRESHOLD = 50;

type ViewMode = 'month' | 'week';

/**
 * カレンダー画面(月表示・週表示)
 * -----------------------------------------------------------------------
 * 各日に予約人数を表示し、以下のルールで背景色を変える。
 * - 予約なし: 通常色
 * - 予約あり・未会計を含む: ピンク
 * - 予約あり・全員会計済み: グリーン
 * - 今日: ゴールド枠(他の色分けと重ねて表示)
 *
 * 上部の切り替えボタンで「月」「週」表示を切り替えられる。
 * 前後の月・週への移動は、矢印ボタンのタップに加えて、
 * カレンダー部分を左右にスワイプすることでも行える。
 * 画面を上から下に引っ張ると更新した手応え(プルリフレッシュ)が得られる。
 *
 * 人数(セル)をタップすると、その日の予約一覧画面へ遷移する。
 * -----------------------------------------------------------------------
 */
export default function CalendarPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const today = new Date();

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [weekAnchor, setWeekAnchor] = useState(today);

  const todayString = todayDateString();

  const range =
    viewMode === 'month' ? monthDateRange(year, month) : weekDateRange(weekAnchor);
  const { reservationsByDate, isLoading, errorMessage } = useReservationsInRange(
    range.start,
    range.end,
  );

  const {
    pullDistance,
    isRefreshing,
    touchHandlers: pullHandlers,
  } = usePullToRefresh(() => showToast('最新の状態です'));

  const cells =
    viewMode === 'month' ? buildMonthGrid(year, month) : buildWeekGrid(weekAnchor);

  function goToMonth(delta: number) {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  }

  function goToWeek(delta: number) {
    setWeekAnchor((current) => shiftWeek(current, delta));
  }

  function goPrev() {
    if (viewMode === 'month') goToMonth(-1);
    else goToWeek(-1);
  }

  function goNext() {
    if (viewMode === 'month') goToMonth(1);
    else goToWeek(1);
  }

  // --- スワイプ操作(左右にスワイプで前後の月/週へ移動) ---
  const touchStartX = useRef<number | null>(null);

  function handleSwipeStart(e: TouchEvent<HTMLDivElement>) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleSwipeEnd(e: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    if (deltaX > SWIPE_THRESHOLD) {
      goPrev(); // 右にスワイプ = 前へ
    } else if (deltaX < -SWIPE_THRESHOLD) {
      goNext(); // 左にスワイプ = 次へ
    }
  }

  return (
    <div className="min-h-dvh pb-24" {...pullHandlers}>
      <AppHeader title="カレンダー" />

      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      <main className="px-5 -mt-2 pt-6">
        {/* 表示切り替え(月/週) */}
        <div className="glass-card p-1.5 flex gap-1 mb-3">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
              viewMode === 'month'
                ? 'brand-gradient text-white'
                : 'text-ink-soft active:bg-lumina-blush/40'
            }`}
          >
            月表示
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
              viewMode === 'week'
                ? 'brand-gradient text-white'
                : 'text-ink-soft active:bg-lumina-blush/40'
            }`}
          >
            週表示
          </button>
        </div>

        <div
          className="glass-card p-4"
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
        >
          {/* 月/週切り替え */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              type="button"
              onClick={goPrev}
              aria-label="前へ"
              className="h-10 w-10 flex items-center justify-center rounded-full
                         text-lumina-wisteria transition-transform
                         active:bg-lumina-blush/50 active:scale-90"
            >
              ‹
            </button>
            <p className="text-lg text-ink" style={{ fontFamily: 'var(--font-display)' }}>
              {viewMode === 'month' ? (
                `${year}年${month}月`
              ) : (
                <span className="text-base">{formatWeekRangeLabel(weekAnchor)}</span>
              )}
            </p>
            <button
              type="button"
              onClick={goNext}
              aria-label="次へ"
              className="h-10 w-10 flex items-center justify-center rounded-full
                         text-lumina-wisteria transition-transform
                         active:bg-lumina-blush/50 active:scale-90"
            >
              ›
            </button>
          </div>

          {errorMessage && (
            <p className="text-sm text-lumina-pink-deep text-center py-4">
              {errorMessage}
            </p>
          )}

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={label}
                className={`text-center text-xs py-1 ${
                  i === 0
                    ? 'text-lumina-pink-deep'
                    : i === 6
                      ? 'text-lumina-wisteria'
                      : 'text-ink-soft'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const dayReservations = reservationsByDate.get(cell.date);
              const status = getDayStatus(dayReservations);
              const isToday = cell.date === todayString;
              const count = dayReservations?.length ?? 0;

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => navigate(`/reservations/${cell.date}`)}
                  className={dayCellClass({
                    status,
                    isToday,
                    isCurrentMonth: cell.isCurrentMonth,
                  })}
                >
                  <span className="text-xs">{cell.day}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-medium leading-none mt-0.5">
                      {count}件
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {isLoading && (
            <p className="text-xs text-ink-soft text-center pt-4">読み込み中…</p>
          )}

          <p className="text-[11px] text-ink-soft text-center pt-3">
            左右にスワイプでも移動できます
          </p>
        </div>

        {/* 凡例 */}
        <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-ink-soft">
          <LegendDot className="bg-status-unpaid" label="未会計あり" />
          <LegendDot className="bg-status-paid" label="全員会計済" />
          <LegendDot className="bg-lumina-gold" label="今日" />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function dayCellClass({
  status,
  isToday,
  isCurrentMonth,
}: {
  status: 'none' | 'unpaid' | 'paid';
  isToday: boolean;
  isCurrentMonth: boolean;
}): string {
  const base =
    'aspect-square flex flex-col items-center justify-center rounded-lg transition-transform active:scale-90';

  const statusClass =
    status === 'unpaid'
      ? 'bg-status-unpaid text-white'
      : status === 'paid'
        ? 'bg-status-paid text-white'
        : 'bg-status-none/60 text-ink';

  const opacityClass = isCurrentMonth ? '' : 'opacity-35';
  const todayClass = isToday ? 'ring-2 ring-lumina-gold ring-offset-1' : '';

  return `${base} ${statusClass} ${opacityClass} ${todayClass}`;
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
