/**
 * 新規予約が入ったときの通知メール送信
 * -----------------------------------------------------------------------
 * Google Apps Scriptで公開したウェブアプリに予約内容をPOSTし、
 * スタッフの登録メールアドレス宛(オーナーにもCc)でメールを送ってもらう。
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
export interface NewReservationNotice {
  customerName: string;
  date: string;
  startTime: string;
  priceAmount: number;
  isNominated: boolean;
}

export async function notifyNewReservation(reservation: NewReservationNotice): Promise<void> {
  if (!NOTIFY_WEBAPP_URL) return; // Apps Script未設置の間は何もしない

  try {
    const { staffEmail } = await getNotificationSettings();
    if (!staffEmail) return; // 通知先が未登録ならスキップ

    await fetch(NOTIFY_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        secret: NOTIFY_SECRET,
        staffEmail,
        customerName: reservation.customerName,
        date: reservation.date,
        startTime: reservation.startTime,
        priceAmount: reservation.priceAmount,
        isNominated: reservation.isNominated,
      }),
    });
  } catch (err) {
    console.error('予約通知メールの送信に失敗しました', err);
  }
}
