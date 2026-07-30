import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { subscribePaymentHistory } from '../lib/paymentHistory';
import { formatCurrency } from '../utils/format';
import type { PaymentHistoryEntry, PaymentMethod } from '../types';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: '現金',
  card: 'カード',
  emoney: '電子マネー',
};

/**
 * 予約の修正履歴閲覧画面(オーナー専用)
 * 会計内容(ポイント・支払い方法・売上対象・支払金額)の変更前後を一覧表示する。
 */
export default function ReservationHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PaymentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id || user?.role !== 'owner') return;
    const unsubscribe = subscribePaymentHistory(id, (data) => {
      setEntries(data);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [id, user]);

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
    <div className="min-h-dvh pb-16">
      <AppHeader title="修正履歴" />

      <main className="px-5 -mt-2 pt-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate(`/reservation/${id}`)}
          className="text-sm text-lumina-wisteria"
        >
          ← 予約詳細に戻る
        </button>

        {isLoading && (
          <p className="text-sm text-ink-soft py-6 text-center">読み込み中…</p>
        )}

        {!isLoading && entries.length === 0 && (
          <div className="glass-card p-5">
            <p className="text-sm text-ink-soft py-6 text-center">
              修正履歴はまだありません
            </p>
          </div>
        )}

        {!isLoading && entries.length > 0 && (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="glass-card p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-ink-soft">
                  <span>{new Date(entry.changedAt).toLocaleString('ja-JP')}</span>
                  <span>{entry.changedByName}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[11px] text-ink-soft mb-0.5">変更前</p>
                    <HistoryValue payment={entry.before} />
                  </div>
                  <div>
                    <p className="text-[11px] text-ink-soft mb-0.5">変更後</p>
                    <HistoryValue payment={entry.after} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function HistoryValue({
  payment,
}: {
  payment: PaymentHistoryEntry['before'] | PaymentHistoryEntry['after'];
}) {
  if (!payment) {
    return <p className="text-ink-soft text-xs">(未設定)</p>;
  }

  return (
    <div className="text-xs text-ink space-y-0.5">
      <p>支払金額: {formatCurrency(payment.paidAmount)}</p>
      <p>ポイント: {formatCurrency(payment.pointsUsed)}</p>
      <p>方法: {PAYMENT_METHOD_LABELS[payment.method]}</p>
      <p>売上対象: {payment.isRevenueTarget ? 'はい' : 'いいえ'}</p>
    </div>
  );
}
