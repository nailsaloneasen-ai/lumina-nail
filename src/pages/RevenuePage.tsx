import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import ReservationListItem from '../components/ReservationListItem';
import { useAuth } from '../contexts/AuthContext';
import { useRevenueData } from '../hooks/useRevenueData';
import { formatCurrency } from '../utils/format';
import type { RevenuePeriod } from '../types';

const PERIOD_LABELS: Record<RevenuePeriod, string> = {
  today: '今日',
  month: '今月',
  year: '年',
};

/**
 * 売上画面(オーナー専用)
 * -----------------------------------------------------------------------
 * 期間(今日/今月/年)を切り替えて、総売上・支払い方法別売上・ポイント利用額・
 * 客数・平均客単価を確認できる。未会計の予約一覧もここから確認できる。
 * -----------------------------------------------------------------------
 */
export default function RevenuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<RevenuePeriod>('today');
  const { summary, unpaidReservations, isLoading, errorMessage } = useRevenueData(period);

  // 従業員がURLを直接開いた場合の防御(ナビゲーション上は従業員に表示されない)
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

  return (
    <div className="min-h-dvh pb-24">
      <AppHeader title="売上" />

      <main className="px-5 -mt-2 pt-6 space-y-5">
        {/* 期間切り替え */}
        <div className="glass-card p-1.5 flex gap-1">
          {(Object.keys(PERIOD_LABELS) as RevenuePeriod[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                period === key
                  ? 'brand-gradient text-white'
                  : 'text-ink-soft active:bg-lumina-blush/40'
              }`}
            >
              {PERIOD_LABELS[key]}
            </button>
          ))}
        </div>

        {errorMessage && (
          <p className="text-sm text-lumina-pink-deep text-center">{errorMessage}</p>
        )}

        {/* 総売上 */}
        <div className="glass-card p-6 text-center">
          <p className="text-xs text-ink-soft mb-1">総売上({PERIOD_LABELS[period]})</p>
          <p className="text-4xl text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            {formatCurrency(summary.totalRevenue)}
          </p>
        </div>

        {/* 支払い方法別 */}
        <div className="glass-card p-5 grid grid-cols-3 gap-3 text-center">
          <SummaryItem label="現金" value={formatCurrency(summary.cashRevenue)} />
          <SummaryItem label="カード" value={formatCurrency(summary.cardRevenue)} />
          <SummaryItem label="電子マネー" value={formatCurrency(summary.emoneyRevenue)} />
        </div>

        {/* その他指標 */}
        <div className="glass-card p-5 grid grid-cols-3 gap-3 text-center">
          <SummaryItem
            label="ポイント利用"
            value={formatCurrency(summary.totalPointsUsed)}
          />
          <SummaryItem label="客数" value={`${summary.customerCount}人`} />
          <SummaryItem label="平均客単価" value={formatCurrency(summary.averageSpend)} />
        </div>

        {/* 未会計一覧 */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-ink">未会計一覧</p>
            <span className="text-xs text-ink-soft">{unpaidReservations.length}件</span>
          </div>

          {isLoading && (
            <p className="text-sm text-ink-soft py-6 text-center">読み込み中…</p>
          )}

          {!isLoading && unpaidReservations.length === 0 && (
            <p className="text-sm text-ink-soft py-6 text-center">
              未会計の予約はありません
            </p>
          )}

          {!isLoading && unpaidReservations.length > 0 && (
            <div className="space-y-2">
              {unpaidReservations.map((reservation) => (
                <ReservationListItem
                  key={reservation.id}
                  reservation={reservation}
                  onClick={(r) => navigate(`/reservation/${r.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-ink-soft mb-1">{label}</p>
      <p className="text-sm font-medium text-ink">{value}</p>
    </div>
  );
}
