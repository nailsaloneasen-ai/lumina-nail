import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import PhoneNumberInput from '../components/PhoneNumberInput';
import CurrencyInput from '../components/CurrencyInput';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  createReservation,
  findOverlappingReservations,
  getReservationOnce,
  updateReservationDetails,
  type ReservationInput,
} from '../lib/reservations';
import { calculateEndTime, formatDateJP } from '../utils/format';

/**
 * 予約登録・編集フォーム画面
 * -----------------------------------------------------------------------
 * URLパラメータの有無でモードを判定する:
 * - /reservations/:date/new  → 新規登録モード(dateパラメータを使用)
 * - /reservation/:id/edit    → 編集モード(idパラメータを使用、既存データを読み込む)
 *
 * オーナー専用画面(予約追加・編集はオーナーのみの権限)。
 * -----------------------------------------------------------------------
 */
export default function ReservationFormPage() {
  const { date: dateParam, id: idParam } = useParams<{ date?: string; id?: string }>();
  const isEditMode = Boolean(idParam);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isOnline = useOnlineStatus();

  const [date, setDate] = useState(dateParam ?? '');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [customerName, setCustomerName] = useState('');
  const [customerKana, setCustomerKana] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [priceAmount, setPriceAmount] = useState(0);
  const [isNominated, setIsNominated] = useState(false);
  const [memo, setMemo] = useState('');

  const [isInitialLoading, setIsInitialLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingOverlapSave, setPendingOverlapSave] = useState(false);
  const [pendingLeaveConfirm, setPendingLeaveConfirm] = useState(false);

  // 編集モード: 既存データを読み込んでフォームに反映する
  useEffect(() => {
    if (!isEditMode || !idParam) return;

    let isCancelled = false;
    getReservationOnce(idParam).then((reservation) => {
      if (isCancelled || !reservation) return;
      setDate(reservation.date);
      setStartTime(reservation.startTime);
      setDurationMinutes(reservation.durationMinutes);
      setCustomerName(reservation.customerName);
      setCustomerKana(reservation.customerKana);
      setPhoneDigits(reservation.phoneNumber.replace(/\D/g, ''));
      setPriceAmount(reservation.priceAmount);
      // 今回の機能追加より前に作成された予約にはisNominatedフィールド自体が
      // 存在しないため(Firestore上はundefined)、falseにフォールバックする
      setIsNominated(reservation.isNominated ?? false);
      setMemo(reservation.memo);
      setIsInitialLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [isEditMode, idParam]);

  const endTime = startTime ? calculateEndTime(startTime, durationMinutes) : '';

  // --- 未保存の変更を検知する仕組み ---
  // 初期データの読み込み(編集モード時)による変更は「未保存」とみなさないよう、
  // isInitialLoadingがtrueの間、および読み込み完了直後の1回はスキップする。
  const isDirtyRef = useRef(false);
  const hasSkippedFirstChangeRef = useRef(false);

  useEffect(() => {
    if (isInitialLoading) return;
    if (!hasSkippedFirstChangeRef.current) {
      hasSkippedFirstChangeRef.current = true;
      return;
    }
    isDirtyRef.current = true;
  }, [
    isInitialLoading,
    date,
    startTime,
    durationMinutes,
    customerName,
    customerKana,
    phoneDigits,
    priceAmount,
    isNominated,
    memo,
  ]);

  // ブラウザのタブを閉じる・リロードする際に、未保存の変更があれば確認ダイアログを出す
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  /** キャンセルボタン等、アプリ内で離脱しようとした時に未保存の変更があれば確認する */
  function handleLeaveAttempt() {
    if (isDirtyRef.current) {
      setPendingLeaveConfirm(true);
    } else {
      navigate(-1);
    }
  }

  function validate(): string | null {
    if (!customerName.trim()) return '顧客名を入力してください';
    if (!durationMinutes || durationMinutes <= 0) return '施術時間を入力してください';
    if (priceAmount < 0) return '施術金額を正しく入力してください';
    return null;
  }

  async function persist() {
    if (!user) return;

    const input: ReservationInput = {
      customerName: customerName.trim(),
      customerKana: customerKana.trim(),
      phoneNumber: phoneDigits,
      date,
      startTime,
      durationMinutes,
      endTime,
      priceAmount,
      isNominated,
      memo,
    };

    setIsSaving(true);
    try {
      if (isEditMode && idParam) {
        await updateReservationDetails(idParam, input, user.uid);
        isDirtyRef.current = false;
        showToast('保存しました');
        navigate(`/reservation/${idParam}`);
      } else {
        const newId = await createReservation(input, user.uid);
        isDirtyRef.current = false;
        showToast('予約を登録しました');
        navigate(`/reservation/${newId}`);
      }
    } catch {
      setErrorMessage('保存に失敗しました。通信環境をご確認のうえ再度お試しください。');
      setIsSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!isOnline) {
      setErrorMessage(
        'オフラインのため保存できません。オンラインになってから再度お試しください。',
      );
      return;
    }

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    // 開始時間が指定されている場合のみ重複チェックを行う
    if (startTime) {
      const overlaps = await findOverlappingReservations(
        date,
        startTime,
        endTime,
        idParam,
      );
      if (overlaps.length > 0) {
        setPendingOverlapSave(true);
        return;
      }
    }

    await persist();
  }

  if (user?.role !== 'owner') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-sm text-ink-soft">この画面はオーナーのみ利用できます</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-lumina-wisteria"
        >
          戻る
        </button>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-sm text-ink-soft">読み込み中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-16">
      <AppHeader title={isEditMode ? '予約編集' : '新規予約'} />

      <main className="px-5 -mt-2 pt-6 space-y-4">
        <p className="text-sm text-ink-soft">{formatDateJP(date)}</p>

        <form onSubmit={handleSubmit} className="glass-card p-5 space-y-5" noValidate>
          {/* 開始時間(任意)・施術時間 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="startTime" className="block text-sm text-ink-soft mb-1.5">
                開始時間(任意)
              </label>
              <input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                           text-base text-ink outline-none focus:border-lumina-pink-deep
                           focus:ring-2 focus:ring-lumina-pink/40"
              />
            </div>
            <div>
              <label
                htmlFor="durationMinutes"
                className="block text-sm text-ink-soft mb-1.5"
              >
                施術時間(分)<span className="text-lumina-pink-deep"> *</span>
              </label>
              <input
                id="durationMinutes"
                type="number"
                inputMode="numeric"
                min={1}
                value={durationMinutes || ''}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                           text-base text-ink outline-none focus:border-lumina-pink-deep
                           focus:ring-2 focus:ring-lumina-pink/40"
              />
            </div>
          </div>

          {startTime && (
            <p className="text-xs text-ink-soft -mt-2">終了時間(自動計算): {endTime}</p>
          )}

          {/* 顧客名・読み仮名 */}
          <div>
            <label htmlFor="customerName" className="block text-sm text-ink-soft mb-1.5">
              顧客名<span className="text-lumina-pink-deep"> *</span>
            </label>
            <input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                         text-base text-ink outline-none focus:border-lumina-pink-deep
                         focus:ring-2 focus:ring-lumina-pink/40"
            />
          </div>

          <div>
            <label htmlFor="customerKana" className="block text-sm text-ink-soft mb-1.5">
              読み仮名
            </label>
            <input
              id="customerKana"
              type="text"
              value={customerKana}
              onChange={(e) => setCustomerKana(e.target.value)}
              className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                         text-base text-ink outline-none focus:border-lumina-pink-deep
                         focus:ring-2 focus:ring-lumina-pink/40"
            />
          </div>

          {/* 電話番号 */}
          <PhoneNumberInput
            label="電話番号"
            value={phoneDigits}
            onChange={setPhoneDigits}
          />

          {/* 施術金額(任意。予約時点で未定の場合は空欄のまま登録し、会計画面で入力できる) */}
          <CurrencyInput
            label="施術金額(未定の場合は空欄のままでOK・会計時に入力できます)"
            value={priceAmount}
            onChange={setPriceAmount}
          />

          {/* 指名の有無 */}
          <button
            type="button"
            onClick={() => setIsNominated((current) => !current)}
            className="w-full flex items-center justify-between rounded-xl bg-white/70 px-4 py-3
                       border border-lumina-blush"
          >
            <span className="text-sm text-ink">指名</span>
            <span
              className={`h-6 w-11 rounded-full relative transition-colors ${
                isNominated ? 'brand-gradient' : 'bg-lumina-blush'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isNominated ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
          </button>

          {/* メモ */}
          <div>
            <label htmlFor="memo" className="block text-sm text-ink-soft mb-1.5">
              メモ
            </label>
            <textarea
              id="memo"
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="施術内容・注意事項など自由に入力できます"
              className="w-full rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                         text-base text-ink outline-none focus:border-lumina-pink-deep
                         focus:ring-2 focus:ring-lumina-pink/40 resize-none"
            />
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="text-sm text-lumina-pink-deep bg-lumina-cream rounded-lg px-3 py-2"
            >
              {errorMessage}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleLeaveAttempt}
              className="flex-1 rounded-xl py-3.5 text-sm font-medium text-ink-soft
                         border border-lumina-blush active:bg-lumina-blush/40 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSaving || !isOnline}
              className="flex-1 brand-gradient rounded-xl py-3.5 text-white font-medium
                         shadow-lg shadow-lumina-wisteria/20 disabled:opacity-60
                         transition-[opacity,transform] active:opacity-90 active:scale-95"
            >
              {isSaving ? '保存中…' : '保存'}
            </button>
          </div>
        </form>
      </main>

      {pendingOverlapSave && (
        <ConfirmDialog
          title="重複予約の確認"
          message={'この時間帯には既に予約があります。\n登録しますか?'}
          confirmLabel="そのまま登録"
          cancelLabel="キャンセル"
          onCancel={() => setPendingOverlapSave(false)}
          onConfirm={() => {
            setPendingOverlapSave(false);
            void persist();
          }}
        />
      )}
      {pendingLeaveConfirm && (
        <ConfirmDialog
          title="保存されていません"
          message={'入力した内容は保存されていません。\nこのまま画面を閉じますか?'}
          confirmLabel="保存せずに閉じる"
          cancelLabel="入力に戻る"
          danger
          onCancel={() => setPendingLeaveConfirm(false)}
          onConfirm={() => {
            isDirtyRef.current = false;
            setPendingLeaveConfirm(false);
            navigate(-1);
          }}
        />
      )}
    </div>
  );
}
