import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { DetailFieldsSkeleton } from '../components/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useReservation } from '../hooks/useReservation';
import { softDeleteReservation, updateReservationMemo } from '../lib/reservations';
import { restoreReservation } from '../lib/trash';
import { formatCurrency, formatDateJP, formatPhoneNumber } from '../utils/format';
import type { PaymentMethod } from '../types';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: '現金',
  card: 'カード',
  emoney: '電子マネー',
};

/**
 * 予約詳細画面
 * -----------------------------------------------------------------------
 * ・全項目の表示(顧客名/読み仮名/電話番号/時間/金額/メモ)
 * ・編集・削除ボタンはオーナーのみ
 * ・メモはオーナーはこの画面からいつでも編集可能。従業員は閲覧のみで、
 *   「会計画面からのみ編集可能」という要件のため、この画面では編集不可。
 * ・支払いボタンは全員が利用可能
 *
 * 削除操作は、確認ダイアログで止める方式ではなく、即座に削除(ゴミ箱行き)した上で
 * 「削除しました [元に戻す]」というトースト通知を数秒表示する方式にしている。
 * ゴミ箱機能があるため、確認ダイアログを挟まなくても実質的な安全性は保たれる。
 * -----------------------------------------------------------------------
 */
export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isOnline = useOnlineStatus();
  const { reservation, errorMessage } = useReservation(id);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [memoDraft, setMemoDraft] = useState('');
  const [isSavingMemo, setIsSavingMemo] = useState(false);

  const isOwner = user?.role === 'owner';

  if (errorMessage) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <p className="text-sm text-lumina-pink-deep">{errorMessage}</p>
      </div>
    );
  }

  if (reservation === undefined) {
    return (
      <div className="min-h-dvh pb-16">
        <AppHeader title="予約詳細" />
        <main className="px-5 -mt-2 pt-6">
          <div className="glass-card p-5">
            <DetailFieldsSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (reservation === null || !id) {
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

  async function handleDelete() {
    if (!user || !id || !reservation) return;
    setIsDeleting(true);
    try {
      await softDeleteReservation(id, user.uid);
      const deletedDate = reservation.date;
      showToast('削除しました', {
        actionLabel: '元に戻す',
        onAction: () => void restoreReservation(id, user.uid),
        durationMs: 5000,
      });
      navigate(`/reservations/${deletedDate}`);
    } catch {
      setIsDeleting(false);
      showToast('削除に失敗しました');
    }
  }

  function startEditingMemo() {
    setMemoDraft(reservation!.memo);
    setIsEditingMemo(true);
  }

  async function saveMemo() {
    if (!user || !id) return;
    setIsSavingMemo(true);
    try {
      await updateReservationMemo(id, memoDraft, user.uid);
      setIsEditingMemo(false);
      showToast('メモを保存しました');
    } finally {
      setIsSavingMemo(false);
    }
  }

  return (
    <div className="min-h-dvh pb-16">
      <AppHeader title="予約詳細" />

      <main className="px-5 -mt-2 pt-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate(`/reservations/${reservation.date}`)}
          className="text-sm text-lumina-wisteria active:opacity-60 transition-opacity"
        >
          ← 予約一覧に戻る
        </button>

        <div className="glass-card p-5 space-y-4">
          {/* 会計ステータス */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-soft">{formatDateJP(reservation.date)}</p>
            {reservation.isPaid ? (
              <span className="text-xs font-medium text-white bg-status-paid rounded-full px-3 py-1">
                会計済
              </span>
            ) : (
              <span className="text-xs font-medium text-lumina-pink-deep bg-lumina-cream rounded-full px-3 py-1">
                未会計
              </span>
            )}
          </div>

          <DetailRow label="顧客名" value={reservation.customerName} large />
          {reservation.customerKana && (
            <DetailRow label="読み仮名" value={reservation.customerKana} />
          )}
          {reservation.phoneNumber && (
            <DetailRow
              label="電話番号"
              value={formatPhoneNumber(reservation.phoneNumber)}
            />
          )}

          <div className="grid grid-cols-3 gap-2 pt-1">
            <DetailRow label="開始時間" value={reservation.startTime || '未定'} />
            <DetailRow label="施術時間" value={`${reservation.durationMinutes}分`} />
            <DetailRow label="終了時間" value={reservation.endTime || '未定'} />
          </div>

          <DetailRow
            label="施術金額"
            value={
              reservation.priceAmount > 0
                ? formatCurrency(reservation.priceAmount)
                : '未定(会計時に入力)'
            }
            large
          />

          <DetailRow label="指名" value={reservation.isNominated ? 'あり' : 'なし'} />

          {/* 支払い方法・ポイント利用(会計済みの場合のみ表示) */}
          {reservation.payment && (
            <>
              <DetailRow
                label="支払い方法"
                value={PAYMENT_METHOD_LABELS[reservation.payment.method]}
              />
              <DetailRow
                label="ポイント利用"
                value={
                  reservation.payment.pointsUsed > 0
                    ? `${reservation.payment.pointsUsed.toLocaleString('ja-JP')}pt`
                    : '利用なし'
                }
              />
            </>
          )}

          {/* メモ */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-ink-soft">メモ</p>
              {isOwner && !isEditingMemo && (
                <button
                  type="button"
                  onClick={startEditingMemo}
                  className="text-xs text-lumina-wisteria active:opacity-60 transition-opacity"
                >
                  編集
                </button>
              )}
            </div>

            {isEditingMemo ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={memoDraft}
                  onChange={(e) => setMemoDraft(e.target.value)}
                  className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                             text-sm text-ink outline-none focus:border-lumina-pink-deep
                             focus:ring-2 focus:ring-lumina-pink/40 resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingMemo(false)}
                    className="rounded-lg px-3 py-1.5 text-xs text-ink-soft active:opacity-60 transition-opacity"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    disabled={isSavingMemo || !isOnline}
                    onClick={() => void saveMemo()}
                    className="rounded-lg px-4 py-1.5 text-xs text-white brand-gradient
                               disabled:opacity-60 transition-transform active:scale-95"
                  >
                    {isSavingMemo ? '保存中…' : '保存'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink whitespace-pre-line bg-white/60 rounded-lg px-4 py-3 min-h-12">
                {reservation.memo || (
                  <span className="text-ink-soft">
                    {isOwner
                      ? 'メモはまだありません'
                      : 'メモの編集は会計画面から行えます'}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* 支払いボタン(全員利用可) */}
        <button
          type="button"
          onClick={() => navigate(`/reservation/${id}/pay`)}
          className="w-full brand-gradient rounded-xl py-3.5 text-white font-medium
                     shadow-lg shadow-lumina-wisteria/20 transition-[opacity,transform]
                     active:opacity-90 active:scale-[0.98]"
        >
          {reservation.isPaid ? '会計内容を確認・修正' : '支払い'}
        </button>

        {/* 編集・削除(オーナーのみ) */}
        {isOwner && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(`/reservation/${id}/edit`)}
              className="flex-1 rounded-xl py-3 text-sm font-medium text-lumina-wisteria
                         border border-lumina-wisteria/30 transition-[background-color,transform]
                         active:bg-lumina-blush/40 active:scale-[0.98]"
            >
              編集
            </button>
            <button
              type="button"
              disabled={!isOnline || isDeleting}
              onClick={() => void handleDelete()}
              className="flex-1 rounded-xl py-3 text-sm font-medium text-lumina-pink-deep
                         border border-lumina-pink-deep/30 transition-[background-color,transform]
                         active:bg-lumina-cream active:scale-[0.98] disabled:opacity-50"
            >
              {isDeleting ? '削除中…' : '削除'}
            </button>
          </div>
        )}

        {/* 修正履歴(オーナーのみ) */}
        {isOwner && (
          <button
            type="button"
            onClick={() => navigate(`/reservation/${id}/history`)}
            className="w-full text-center text-xs text-lumina-wisteria py-2 active:opacity-60 transition-opacity"
          >
            修正履歴を見る
          </button>
        )}
      </main>
    </div>
  );
}

function DetailRow({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-ink-soft mb-0.5">{label}</p>
      <p className={large ? 'text-xl text-ink' : 'text-sm text-ink'}>{value}</p>
    </div>
  );
}
