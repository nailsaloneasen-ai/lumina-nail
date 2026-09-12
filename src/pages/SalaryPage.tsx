import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { useRevenueData } from '../hooks/useRevenueData';
import { calculateStaffSalary, dateRangeForPeriod } from '../lib/revenue';
import { formatCurrency } from '../utils/format';
import type { RevenuePeriod } from '../types';

/** 給与計算画面で使う期間。売上画面と異なり「期間指定(custom)」は含まない */
type SalaryPeriod = Exclude<RevenuePeriod, 'custom'>;

const PERIOD_LABELS: Record<SalaryPeriod, string> = {
  today: '今日',
  week: '週',
  month: '今月',
  year: '年',
};

/**
 * 給与計算画面(オーナー専用)
 * -----------------------------------------------------------------------
 * 期間(今日/週/今月/年)を切り替えて、その期間の売上をもとに従業員の給与を
 * 自動計算する。
 *
 * 計算方法:
 * 1. 売上(施術金額ベース)を半分にする
 * 2. その半分を税込金額とみなし、税抜き額に変換する(1円未満は切り上げ)
 * 3. 指名1件につき500円のボーナスを、指名件数分加算する
 *    (このアプリの指名は常に従業員への指名)
 * -----------------------------------------------------------------------
 */
export default function SalaryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<SalaryPeriod>('month');

  const range = dateRangeForPeriod(period);
  const { reservations, isLoading, errorMessage, isPossiblyIncomplete } = useRevenueData(
    range.start,
    range.end,
  );

  const salary = calculateStaffSalary(reservations);

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
      <AppHeader title="給与計算" />

      <main className="px-5 -mt-2 pt-6 space-y-5">
        {/* 期間切り替え */}
        <div className="glass-card p-1.5 flex gap-1">
          {(Object.keys(PERIOD_LABELS) as SalaryPeriod[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`flex-1 rounded-xl py-2.5 text-xs sm:text-sm font-medium transition-colors ${
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

        {isPossiblyIncomplete && (
          <p className="text-xs text-lumina-pink-deep bg-lumina-cream rounded-lg px-3 py-2">
            この期間はデータ件数が多いため、集計結果が一部のみになっている可能性があります。
            期間を狭めて確認することをおすすめします。
          </p>
        )}

        {isLoading && (
          <p className="text-sm text-ink-soft py-6 text-center">読み込み中…</p>
        )}

        {!isLoading && (
          <>
            {/* 給与(合計) */}
            <div className="glass-card p-6 text-center">
              <p className="text-xs text-ink-soft mb-1">給与({PERIOD_LABELS[period]})</p>
              <p className="text-4xl text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                {formatCurrency(salary.salary)}
              </p>
            </div>

            {/* 計算内訳 */}
            <div className="glass-card p-5 space-y-3">
              <p className="text-sm font-medium text-ink mb-1">計算内訳</p>

              <SalaryRow label="売上(施術金額ベース)" value={formatCurrency(salary.revenue)} />
              <SalaryRow label="売上の半分" value={formatCurrency(salary.half)} />
              <SalaryRow
                label="税抜き変換後(1円未満切り上げ)"
                value={formatCurrency(salary.taxExcludedHalf)}
              />
              <SalaryRow
                label={`指名ボーナス(500円 × ${salary.nominatedCount}件)`}
                value={formatCurrency(salary.nominationBonus)}
              />

              <div className="border-t border-lumina-blush pt-3 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">給与合計</p>
                <p className="text-lg font-medium text-lumina-wisteria">
                  {formatCurrency(salary.salary)}
                </p>
              </div>
            </div>

            {/* 計算式の説明 */}
            <div className="glass-card p-5">
              <p className="text-xs text-ink-soft leading-relaxed">
                給与 = 売上の半分を税抜きに変換した金額(1円未満切り上げ) + 指名ボーナス(1件500円)
                <br />
                売上は施術金額ベース(ポイント値引きの影響を受けません)。指名はこのアプリでは常に従業員への指名として扱われます。
              </p>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function SalaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="text-sm text-ink">{value}</p>
    </div>
  );
}
