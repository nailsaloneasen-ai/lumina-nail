/**
 * 予約の通知メール送信
 * -----------------------------------------------------------------------
 * Google Apps Scriptで公開したウェブアプリに予約内容をPOSTし、
 * スタッフの登録メールアドレス宛(オーナーにもCc)でメールを送ってもらう。
 * - 新規予約作成時: 常に自動送信(src/lib/reservations.ts createReservation)
 * - 既存予約の変更時: オーナーが保存時に確認ダイアログで「送る」を選んだ場合のみ送信
 *   (src/pages/ReservationFormPage.tsx)
 *
 * - 通知の失敗が予約の保存自体を妨げないよう、エラーはここで握りつぶす
 *   (コンソールに記録するのみ)
 * - Apps ScriptのウェブアプリはブラウザからのfetchにCORSヘッダーを
 *   返さないため、mode: 'no-cors' で送信する(レスポンス内容は読めないが
 *   送信自体は行われる。返り値を確認する必要がないのでこれで問題ない)
 * -----------------------------------------------------------------------
 */
import { NOTIFY_SECRET, NOTIFY_WEBAPP_URL } from './notifyConfig';
import { getNotificationSettings } from './settings';

/** 通知メールの作成に必要な予約情報のみを受け取る(Reservation全体である必要はない) */
export interface ReservationNotice {
  customerName: string;
  date: string;
  startTime: string;
  priceAmount: number;
  isNominated: boolean;
  /** 変更通知(type: 'update')の場合のみ。変わった項目の一覧(空なら変更点なし) */
  changes?: string[];
}

async function sendReservationNotification(
  type: 'new' | 'update',
  reservation: ReservationNotice,
): Promise<void> {
  if (!NOTIFY_WEBAPP_URL) return; // Apps Script未設置の間は何もしない

  try {
    const { staffEmail } = await getNotificationSettings();
    if (!staffEmail) return; // 通知先が未登録ならスキップ

    await fetch(NOTIFY_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        secret: NOTIFY_SECRET,
        type,
        staffEmail,
        customerName: reservation.customerName,
        date: reservation.date,
        startTime: reservation.startTime,
        priceAmount: reservation.priceAmount,
        isNominated: reservation.isNominated,
        changes: reservation.changes ?? [],
      }),
    });
  } catch (err) {
    console.error('予約通知メールの送信に失敗しました', err);
  }
}

/** 新規予約が作成されたときの通知(常に自動送信) */
export function notifyNewReservation(
  reservation: Omit<ReservationNotice, 'changes'>,
): Promise<void> {
  return sendReservationNotification('new', reservation);
}

/**
 * 既存予約が変更されたときの通知(オーナーが確認ダイアログで選んだ場合のみ呼ばれる)。
 * changesに変更点の一覧を渡すと、メール本文にその箇条書きが入る。
 */
export function notifyReservationUpdate(reservation: ReservationNotice): Promise<void> {
  return sendReservationNotification('update', reservation);
}
