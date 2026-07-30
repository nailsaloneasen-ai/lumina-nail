import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import CurrencyInput from '../components/CurrencyInput';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useReservation } from '../hooks/useReservation';
import { saveReservationPayment, updateReservationMemo } from '../lib/reservations';
import { formatCurrency } from '../utils/format';
import type { AppUser, PaymentMethod, Reservation } from '../types';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: '現金',
  card: 'カード',
  emoney: '電子マネー',
};

/**
 * 会計画面(ルート)
 * -----------------------------------------------------------------------
 * データの読み込み状態(読み込み中/エラー/未存在)をここで判定し、
 * 予約データが揃ってから中身の AccountingForm を描画する。
 * こうすることで、AccountingForm側は「予約データは必ず存在する」前提の
 * シンプルな作りにでき、useEffectでのstate同期(react-hooks lintの警告対象)
 * を避けられる。
 * -----------------------------------------------------------------------
 */
export default function AccountingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reservation, errorMessage } = useReservation(id);

  if (errorMessage) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <p className="text-sm text-lumina-pink-deep">{errorMessage}</p>
      </div>
    );
  }

  if (reservation === undefined) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-sm text-ink-soft">読み込み中…</p>
      </div>
    );
  }

  if (reservation === null || !id || !user) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-sm text-ink-soft">この予約は見つかりませんでした</p>
        <button
          type="button"
          onClick={() => navigate('/calendar')}
          className="text-sm text-lumina-wisteria"
        >
          カレンダーに戻る
        </button>
      </div>
    );
  }

  // key={id} を指定することで、別の予約に遷移した際にフォームの内部stateが
  // 確実にリセットされる(コンポーネントが作り直されるため)
  return <AccountingForm key={id} id={id} reservation={reservation} user={user} />;
}

function AccountingForm({
  id,
  reservation,
  user,
}: {
  id: string;
  reservation: Reservation;
  user: AppUser;
}) {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  const [priceAmount, setPriceAmount] = useState(reservation.priceAmount);
  const [pointsUsed, setPointsUsed] = useState(reservation.payment?.pointsUsed ?? 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    reservation.payment?.method ?? 'cash',
  );
  const [isPaidChecked, setIsPaidChecked] = useState(reservation.isPaid);
  const [isRevenueTarget, setIsRevenueTarget] = useState(
    reservation.payment?.isRevenueTarget ?? true,
  );
  const [memo, setMemo] = useState(reservation.memo);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const paidAmount = Math.max(priceAmount - pointsUsed, 0);
  const pointsExceedsPrice = pointsUsed > priceAmount;

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveReservationPayment(
        id,
        reservation.payment,
        {
          pointsUsed,
          paidAmount,
          method: paymentMethod,
          isRevenueTarget,
          paidAt: new Date().toISOString(),
          paidBy: user.uid,
        },
        priceAmount,
        isPaidChecked,
        user.uid,
        user.displayName,
      );

      // メモは全ユーザーがこの画面から編集可能なため、変更があれば併せて保存する
      if (memo !== reservation.memo) {
        await updateReservationMemo(id, memo, user.uid);
      }

      navigate(`/reservation/${id}`);
    } catch {
      setSaveError('保存に失敗しました。通信環境をご確認のうえ再度お試しください。');
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-dvh pb-16">
      <AppHeader title="会計" />

      <main className="px-5 -mt-2 pt-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate(`/reservation/${id}`)}
          className="text-sm text-lumina-wisteria"
        >
          ← 予約詳細に戻る
        </button>

        <div className="glass-card p-5 space-y-5">
          <p className="text-sm font-medium text-ink">{reservation.customerName}様</p>

          {/* 施術金額(予約時点で未定だった場合は、ここで確定・修正できる) */}
          <CurrencyInput label="施術金額" value={priceAmount} onChange={setPriceAmount} />

          {/* 使用ポイント */}
          <div>
            <label htmlFor="pointsUsed" className="block text-sm text-ink-soft mb-1.5">
              使用ポイント
            </label>
            <input
              id="pointsUsed"
              type="number"
              inputMode="numeric"
              min={0}
              value={pointsUsed || ''}
              onChange={(e) => setPointsUsed(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                         text-base text-ink outline-none focus:border-lumina-pink-deep
                         focus:ring-2 focus:ring-lumina-pink/40"
            />
            {pointsExceedsPrice && (
              <p className="text-xs text-lumina-pink-deep mt-1.5">
                使用ポイントが施術金額を超えています。支払金額は¥0として計算されます。
              </p>
            )}
          </div>

          {/* 支払金額(自動計算) */}
          <div>
            <p className="text-xs text-ink-soft mb-0.5">支払金額(自動計算)</p>
            <p
              className="text-2xl text-ink"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formatCurrency(paidAmount)}
            </p>
          </div>

          {/* 支払い方法 */}
          <div>
            <p className="text-sm text-ink-soft mb-1.5">支払い方法</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-xl py-3 text-sm font-medium transition-colors ${
                    paymentMethod === method
                      ? 'brand-gradient text-white'
                      : 'bg-white/70 text-ink-soft border border-lumina-blush'
                  }`}
                >
                  {PAYMENT_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
          </div>

          {/* チェック項目 */}
          <div className="space-y-3">
            <CheckboxRow
              label="会計済"
              checked={isPaidChecked}
              onChange={setIsPaidChecked}
            />
            <CheckboxRow
              label="売上対象"
              checked={isRevenueTarget}
              onChange={setIsRevenueTarget}
            />
          </div>

          {/* メモ(この画面からは全ユーザー編集可能) */}
          <div>
            <label
              htmlFor="accountingMemo"
              className="block text-sm text-ink-soft mb-1.5"
            >
              メモ
            </label>
            <textarea
              id="accountingMemo"
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="施術内容・注意事項・会計内容など"
              className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                         text-sm text-ink outline-none focus:border-lumina-pink-deep
                         focus:ring-2 focus:ring-lumina-pink/40 resize-none"
            />
          </div>

          {saveError && (
            <p className="text-sm text-lumina-pink-deep bg-lumina-cream rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}

          <button
            type="button"
            disabled={isSaving || !isOnline}
            onClick={() => void handleSave()}
            className="w-full brand-gradient rounded-xl py-3.5 text-white font-medium
                       shadow-lg shadow-lumina-wisteria/20 disabled:opacity-60
                       transition-opacity active:opacity-90"
          >
            {isSaving ? '保存中…' : '保存'}
          </button>
        </div>
      </main>
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between rounded-xl bg-white/70 px-4 py-3
                 border border-lumina-blush"
    >
      <span className="text-sm text-ink">{label}</span>
      <span
        className={`h-6 w-11 rounded-full relative transition-colors ${
          checked ? 'brand-gradient' : 'bg-lumina-blush'
        }`}
      >
       <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}
