import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { useMonthReservations } from '../hooks/useMonthReservations';
import { buildMonthGrid, shiftMonth } from '../utils/calendar';
import { getDayStatus } from '../lib/reservations';
import { todayDateString } from '../utils/format';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * カレンダー画面(月表示)
 * -----------------------------------------------------------------------
 * 各日に予約人数を表示し、以下のルールで背景色を変える。
 * - 予約なし: 通常色
 * - 予約あり・未会計を含む: ピンク
 * - 予約あり・全員会計済み: グリーン
 * - 今日: ゴールド枠(他の色分けと重ねて表示)
 *
 * 人数(セル)をタップすると、その日の予約一覧画面へ遷移する。
 * -----------------------------------------------------------------------
 */
export default function CalendarPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { reservationsByDate, isLoading, errorMessage } = useMonthReservations(
    year,
    month,
  );
  const cells = buildMonthGrid(year, month);
  const todayString = todayDateString();

  function goToMonth(delta: number) {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppHeader title="カレンダー" />

      <main className="px-5 -mt-2 pt-6">
        <div className="glass-card p-4">
          {/* 月切り替え */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              aria-label="前の月"
              className="h-10 w-10 flex items-center justify-center rounded-full
                         text-lumina-wisteria active:bg-lumina-blush/50"
            >
              ‹
            </button>
            <p className="text-lg text-ink" style={{ fontFamily: 'var(--font-display)' }}>
              {year}年{month}月
            </p>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              aria-label="次の月"
              className="h-10 w-10 flex items-center justify-center rounded-full
                         text-lumina-wisteria active:bg-lumina-blush/50"
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
                  disabled={count === 0}
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
    'aspect-square flex flex-col items-center justify-center rounded-lg transition-colors';

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
