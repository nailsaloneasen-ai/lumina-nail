import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useReservation } from '../hooks/useReservation';
import { softDeleteReservation, updateReservationMemo } from '../lib/reservations';
import { formatCurrency, formatDateJP, formatPhoneNumber } from '../utils/format';

/**
 * 予約詳細画面
 * -----------------------------------------------------------------------
 * ・全項目の表示(顧客名/読み仮名/電話番号/時間/金額/メモ)
 * ・編集・削除ボタンはオーナーのみ
 * ・メモはオーナーはこの画面からいつでも編集可能。従業員は閲覧のみで、
 *   「会計画面からのみ編集可能」という要件のため、この画面では編集不可。
 * ・支払いボタンは全員が利用可能(会計画面はステップ6で実装)
 * -----------------------------------------------------------------------
 */
export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const { reservation, errorMessage } = useReservation(id);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-sm text-ink-soft">読み込み中…</p>
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
    if (!user || !id) return;
    setIsDeleting(true);
    try {
      await softDeleteReservation(id, user.uid);
      navigate(`/reservations/${reservation!.date}`);
    } catch {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
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
          className="text-sm text-lumina-wisteria"
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

          {/* メモ */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-ink-soft">メモ</p>
              {isOwner && !isEditingMemo && (
                <button
                  type="button"
                  onClick={startEditingMemo}
                  className="text-xs text-lumina-wisteria"
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
                    className="rounded-lg px-3 py-1.5 text-xs text-ink-soft"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    disabled={isSavingMemo || !isOnline}
                    onClick={() => void saveMemo()}
                    className="rounded-lg px-4 py-1.5 text-xs text-white brand-gradient disabled:opacity-60"
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
                     shadow-lg shadow-lumina-wisteria/20 active:opacity-90 transition-opacity"
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
                         border border-lumina-wisteria/30 active:bg-lumina-blush/40 transition-colors"
            >
              編集
            </button>
            <button
              type="button"
              disabled={!isOnline}
              onClick={() => setIsDeleteDialogOpen(true)}
              className="flex-1 rounded-xl py-3 text-sm font-medium text-lumina-pink-deep
                         border border-lumina-pink-deep/30 active:bg-lumina-cream transition-colors
                         disabled:opacity-50"
            >
              削除
            </button>
          </div>
        )}

        {/* 修正履歴(オーナーのみ) */}
        {isOwner && (
          <button
            type="button"
            onClick={() => navigate(`/reservation/${id}/history`)}
            className="w-full text-center text-xs text-lumina-wisteria py-2"
          >
            修正履歴を見る
          </button>
        )}
      </main>

      {isDeleteDialogOpen && (
        <ConfirmDialog
          title="予約の削除"
          message="本当に削除しますか?"
          confirmLabel={isDeleting ? '削除中…' : '削除する'}
          cancelLabel="キャンセル"
          danger
          onCancel={() => setIsDeleteDialogOpen(false)}
          onConfirm={() => void handleDelete()}
        />
      )}
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
