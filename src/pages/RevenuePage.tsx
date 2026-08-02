import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import ReservationListItem from '../components/ReservationListItem';
import { useAuth } from '../contexts/AuthContext';
import { useRevenueData } from '../hooks/useRevenueData';
import {
  dateRangeForPeriod,
  filterPaidByMethod,
  filterPointsUsage,
} from '../lib/revenue';
import { downloadCsvFile, generateRevenueCsv } from '../lib/csvExport';
import { formatCurrency, formatDateJP, todayDateString } from '../utils/format';
import type { PaymentMethod, Reservation, RevenuePeriod, RevenueSummary } from '../types';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: '現金',
  card: 'カード',
  emoney: '電子マネー',
};

const PERIOD_LABELS: Record<RevenuePeriod, string> = {
  today: '今日',
  month: '今月',
  year: '年',
  custom: '期間指定',
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
  const [customStart, setCustomStart] = useState(todayDateString());
  const [customEnd, setCustomEnd] = useState(todayDateString());
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showPointsDetail, setShowPointsDetail] = useState(false);

  // 期間指定(custom)の場合はカスタム日付を、それ以外はプリセット期間から範囲を計算する。
  // 終了日が開始日より前になっていたら、開始日と同じ日にそろえる(安全策)。
  const range =
    period === 'custom'
      ? { start: customStart, end: customEnd < customStart ? customStart : customEnd }
      : dateRangeForPeriod(period);

  const { summary, unpaidReservations, reservations, isLoading, errorMessage } =
    useRevenueData(range.start, range.end);

  const periodLabel =
    period === 'custom'
      ? `${formatShortDate(range.start)}〜${formatShortDate(range.end)}`
      : PERIOD_LABELS[period];

  function handleExportCsv() {
    const csv = generateRevenueCsv(reservations);
    downloadCsvFile(csv, `lumina-nail-売上_${range.start}_${range.end}.csv`);
  }

  function handleExportPdf() {
    window.print();
  }

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
      <div className="no-print">
        <AppHeader title="売上" />
      </div>

      <main className="no-print px-5 -mt-2 pt-6 space-y-5">
        {/* 期間切り替え */}
        <div className="glass-card p-1.5 flex gap-1">
          {(Object.keys(PERIOD_LABELS) as RevenuePeriod[]).map((key) => (
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

        {/* 期間指定の場合の開始日・終了日入力 */}
        {period === 'custom' && (
          <div className="glass-card p-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="customStart" className="block text-xs text-ink-soft mb-1">
                開始日
              </label>
              <input
                id="customStart"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full rounded-lg border border-lumina-blush bg-white/80 px-2 py-2
                           text-sm text-ink outline-none focus:border-lumina-pink-deep
                           focus:ring-2 focus:ring-lumina-pink/40"
              />
            </div>
            <div>
              <label htmlFor="customEnd" className="block text-xs text-ink-soft mb-1">
                終了日
              </label>
              <input
                id="customEnd"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full rounded-lg border border-lumina-blush bg-white/80 px-2 py-2
                           text-sm text-ink outline-none focus:border-lumina-pink-deep
                           focus:ring-2 focus:ring-lumina-pink/40"
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="text-sm text-lumina-pink-deep text-center">{errorMessage}</p>
        )}

        {/* 総売上 */}
        <div className="glass-card p-6 text-center">
          <p className="text-xs text-ink-soft mb-1">総売上({periodLabel})</p>
          <p className="text-4xl text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            {formatCurrency(summary.totalRevenue)}
          </p>
        </div>

        {/* 支払い方法別(タップすると内訳が見られる) */}
        <div className="glass-card p-5 grid grid-cols-3 gap-3 text-center">
          <SummaryItem
            label="現金"
            value={formatCurrency(summary.cashRevenue)}
            onClick={() => setSelectedMethod('cash')}
          />
          <SummaryItem
            label="カード"
            value={formatCurrency(summary.cardRevenue)}
            onClick={() => setSelectedMethod('card')}
          />
          <SummaryItem
            label="電子マネー"
            value={formatCurrency(summary.emoneyRevenue)}
            onClick={() => setSelectedMethod('emoney')}
          />
        </div>

        {/* その他指標 */}
        <div className="glass-card p-5 grid grid-cols-3 gap-3 text-center">
          <SummaryItem
            label="ポイント利用"
            value={formatCurrency(summary.totalPointsUsed)}
            onClick={() => setShowPointsDetail(true)}
          />
          <SummaryItem label="客数" value={`${summary.customerCount}人`} />
          <SummaryItem label="平均客単価" value={formatCurrency(summary.averageSpend)} />
        </div>

        {/* データ出力(CSV/PDF) */}
        <div className="no-print flex gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex-1 rounded-xl py-3 text-sm font-medium text-lumina-wisteria
                       border border-lumina-wisteria/30 active:bg-lumina-blush/40 transition-colors"
          >
            CSV出力
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex-1 rounded-xl py-3 text-sm font-medium text-lumina-wisteria
                       border border-lumina-wisteria/30 active:bg-lumina-blush/40 transition-colors"
          >
            PDF出力(印刷)
          </button>
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

      {selectedMethod && (
        <PaymentMethodDetailModal
          method={selectedMethod}
          periodLabel={periodLabel}
          entries={filterPaidByMethod(reservations, selectedMethod)}
          onClose={() => setSelectedMethod(null)}
          onSelectReservation={(id) => navigate(`/reservation/${id}`)}
        />
      )}

      {showPointsDetail && (
        <PointsDetailModal
          periodLabel={periodLabel}
          entries={filterPointsUsage(reservations)}
          onClose={() => setShowPointsDetail(false)}
          onSelectReservation={(id) => navigate(`/reservation/${id}`)}
        />
      )}

      {/* 印刷(PDF出力)専用のレポート。画面上には表示されず、印刷時にのみ表示される */}
      <PrintableRevenueReport
        periodLabel={periodLabel}
        summary={summary}
        reservations={reservations}
      />

      <div className="no-print">
        <BottomNav />
      </div>
    </div>
  );
}

/**
 * PDF出力(印刷)専用のレポート。
 * 通常時は非表示(.print-only)で、window.print()が呼ばれた時のみ表示される。
 */
function PrintableRevenueReport({
  periodLabel,
  summary,
  reservations,
}: {
  periodLabel: string;
  summary: RevenueSummary;
  reservations: Reservation[];
}) {
  const targetReservations = reservations
    .filter((r) => r.isPaid && r.payment && r.payment.isRevenueTarget)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  return (
    <div className="print-only p-8 text-black">
      <h1 className="text-2xl font-bold mb-1">S'Argent 売上レポート</h1>
      <p className="text-sm mb-6">対象期間: {periodLabel}</p>

      <table className="w-full text-sm mb-8 border-collapse">
        <tbody>
          <PrintSummaryRow label="総売上" value={formatCurrency(summary.totalRevenue)} />
          <PrintSummaryRow label="現金" value={formatCurrency(summary.cashRevenue)} />
          <PrintSummaryRow label="カード" value={formatCurrency(summary.cardRevenue)} />
          <PrintSummaryRow
            label="電子マネー"
            value={formatCurrency(summary.emoneyRevenue)}
          />
          <PrintSummaryRow
            label="ポイント利用"
            value={`${summary.totalPointsUsed.toLocaleString('ja-JP')}pt`}
          />
          <PrintSummaryRow label="客数" value={`${summary.customerCount}人`} />
          <PrintSummaryRow
            label="平均客単価"
            value={formatCurrency(summary.averageSpend)}
          />
        </tbody>
      </table>

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-1 pr-2">日付</th>
            <th className="text-left py-1 pr-2">顧客名</th>
            <th className="text-right py-1 pr-2">施術金額</th>
            <th className="text-right py-1 pr-2">ポイント</th>
            <th className="text-right py-1 pr-2">支払金額</th>
            <th className="text-left py-1">方法</th>
          </tr>
        </thead>
        <tbody>
          {targetReservations.map((r) => (
            <tr key={r.id} className="border-b border-gray-300">
              <td className="py-1 pr-2">{r.date}</td>
              <td className="py-1 pr-2">{r.customerName}</td>
              <td className="text-right py-1 pr-2">{formatCurrency(r.priceAmount)}</td>
              <td className="text-right py-1 pr-2">
                {r.payment!.pointsUsed.toLocaleString('ja-JP')}pt
              </td>
              <td className="text-right py-1 pr-2">
                {formatCurrency(r.payment!.paidAmount)}
              </td>
              <td className="py-1">{PAYMENT_METHOD_LABELS[r.payment!.method]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PrintSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-gray-300">
      <td className="py-1.5 pr-4 font-medium">{label}</td>
      <td className="py-1.5 text-right">{value}</td>
    </tr>
  );
}

/** YYYY-MM-DD形式の日付を「7/1」のような短い表記に変換する(期間指定の見出し用) */
function formatShortDate(dateString: string): string {
  const [, month, day] = dateString.split('-').map(Number);
  return `${month}/${day}`;
}

function SummaryItem({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <p className="text-[11px] text-ink-soft mb-1">{label}</p>
      <p className="text-sm font-medium text-ink">{value}</p>
    </>
  );

  if (!onClick) {
    return <div>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg py-1 -my-1 active:bg-lumina-blush/40 transition-colors"
    >
      {content}
    </button>
  );
}

/**
 * 支払い方法別の内訳詳細モーダル。
 * 「現金」「カード」「電子マネー」いずれかをタップすると、
 * その方法で支払われた予約(誰がいくら払ったか)を一覧表示する。
 */
function PaymentMethodDetailModal({
  method,
  periodLabel,
  entries,
  onClose,
  onSelectReservation,
}: {
  method: PaymentMethod;
  periodLabel: string;
  entries: ReturnType<typeof filterPaidByMethod>;
  onClose: () => void;
  onSelectReservation: (id: string) => void;
}) {
  const total = entries.reduce((sum, r) => sum + (r.payment?.paidAmount ?? 0), 0);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-ink/30 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="glass-card w-full max-w-sm bg-white/95 max-h-[80vh] flex flex-col">
        <div className="p-5 pb-3 flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs text-ink-soft">
              {periodLabel} ・ {PAYMENT_METHOD_LABELS[method]}の内訳
            </p>
            <p className="text-xl text-ink" style={{ fontFamily: 'var(--font-display)' }}>
              {formatCurrency(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="h-8 w-8 flex items-center justify-center rounded-full text-ink-soft
                       active:bg-lumina-blush/40"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-5 overflow-y-auto space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-ink-soft text-center py-6">
              この期間の{PAYMENT_METHOD_LABELS[method]}での支払いはありません
            </p>
          ) : (
            entries.map((reservation) => (
              <button
                key={reservation.id}
                type="button"
                onClick={() => onSelectReservation(reservation.id)}
                className="w-full flex items-center justify-between gap-3 rounded-xl
                           bg-white/70 px-4 py-3 text-left active:bg-lumina-blush/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {reservation.customerName}
                  </p>
                  <p className="text-xs text-ink-soft truncate">
                    {formatDateJP(reservation.date)}
                    {reservation.startTime && ` ${reservation.startTime}`}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-ink">
                  {formatCurrency(reservation.payment?.paidAmount ?? 0)}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ポイント利用の内訳詳細モーダル。
 * 「ポイント利用」をタップすると、誰がいつ何ポイント使ったかを一覧表示する。
 */
function PointsDetailModal({
  periodLabel,
  entries,
  onClose,
  onSelectReservation,
}: {
  periodLabel: string;
  entries: ReturnType<typeof filterPointsUsage>;
  onClose: () => void;
  onSelectReservation: (id: string) => void;
}) {
  const total = entries.reduce((sum, r) => sum + (r.payment?.pointsUsed ?? 0), 0);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-ink/30 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="glass-card w-full max-w-sm bg-white/95 max-h-[80vh] flex flex-col">
        <div className="p-5 pb-3 flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs text-ink-soft">{periodLabel} ・ ポイント利用の内訳</p>
            <p className="text-xl text-ink" style={{ fontFamily: 'var(--font-display)' }}>
              {total.toLocaleString('ja-JP')}pt
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="h-8 w-8 flex items-center justify-center rounded-full text-ink-soft
                       active:bg-lumina-blush/40"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-5 overflow-y-auto space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-ink-soft text-center py-6">
              この期間のポイント利用はありません
            </p>
          ) : (
            entries.map((reservation) => (
              <button
                key={reservation.id}
                type="button"
                onClick={() => onSelectReservation(reservation.id)}
                className="w-full flex items-center justify-between gap-3 rounded-xl
                           bg-white/70 px-4 py-3 text-left active:bg-lumina-blush/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {reservation.customerName}
                  </p>
                  <p className="text-xs text-ink-soft truncate">
                    {formatDateJP(reservation.date)}
                    {reservation.startTime && ` ${reservation.startTime}`}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-ink">
                  {(reservation.payment?.pointsUsed ?? 0).toLocaleString('ja-JP')}pt
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
