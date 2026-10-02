/**
 * 月次サマリーメール
 * -----------------------------------------------------------------------
 * オーナーがアプリを開いたタイミングで、前月分のサマリーメールが
 * まだ送られていなければ、前月の売上・客数・指名率・給与をまとめて
 * 通知先(スタッフ、オーナーにも自動Cc)にメール送信する。
 *
 * - 「毎月1日の夜中に必ず送る」という完全な自動化ではなく、自動バックアップ
 *   (src/lib/autoBackup.ts)と同じ「アプリを開いたときに、まだ送って
 *   いなければ送る」という方式(無料の範囲で済ませるための割り切り)
 * - 送信済みかどうかはFirestore(settings/monthlySummaryドキュメント)の
 *   lastSentMonth(例: "2026-08")で判定する
 * -----------------------------------------------------------------------
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getReservationsInRangeOnce } from './reservations';
import { calculateStaffSalary, summarizeNomination, summarizeRevenue } from './revenue';
import { getNotificationSettings } from './settings';
import { NOTIFY_SECRET, NOTIFY_WEBAPP_URL } from './notifyConfig';
import { isCancelled } from './cancellation';
import type { CancelStatus } from '../types';

const MONTHLY_SUMMARY_DOC_ID = 'monthlySummary';

function monthlySummaryDocRef() {
  return doc(db, 'settings', MONTHLY_SUMMARY_DOC_ID);
}

/** 「今日」から見た前月の集計期間を求める */
function previousMonthRange(now: Date) {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prev.getFullYear();
  const month = prev.getMonth(); // 0-indexed。この時点で既に前月を指している
  const mm = String(month + 1).padStart(2, '0');
  const lastDay = new Date(year, month + 1, 0).getDate();

  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
    /** 送信済み判定用のキー(例: "2026-08") */
    monthKey: `${year}-${mm}`,
    /** メール本文用の表示ラベル(例: "2026年8月") */
    monthLabel: `${year}年${month + 1}月`,
  };
}

/**
 * 前月分に未会計の予約が残っている間は、サマリーの送信を見送る日付の上限(日)。
 * 月初に送ると、会計入力が済んでいない予約が売上に含まれず、
 * 実際より少ない数字のメールが確定してしまう。そのため、未会計が残っている間は
 * 次にアプリを開いたときまで待つ。ただし、会計を入れ忘れた予約が1件あるだけで
 * 永久に届かないのを防ぐため、この日以降は未会計が残っていても送る。
 */
export const SUMMARY_DEFER_UNTIL_DAY = 10;

/**
 * 月次サマリーの送信を見送るべきかを判定する。
 * (前月分に未会計の予約が残っていて、まだ猶予期間内の場合に true)
 */
export function shouldDeferMonthlySummary(
  reservations: { isPaid: boolean; cancelStatus?: CancelStatus | null }[],
  now: Date,
): boolean {
  if (now.getDate() >= SUMMARY_DEFER_UNTIL_DAY) return false;
  // キャンセルされた予約は会計されないので、未会計として数えない
  return reservations.some((r) => !r.isPaid && !isCancelled(r));
}

/**
 * アプリを開いたタイミングで呼び出す。
 * 前月分のサマリーがまだ送信されていなければ送信する。
 */
export async function sendMonthlySummaryIfDue(): Promise<void> {
  if (!NOTIFY_WEBAPP_URL) return; // Apps Script未設置の間は何もしない

  try {
    const { start, end, monthKey, monthLabel } = previousMonthRange(new Date());

    const snapshot = await getDoc(monthlySummaryDocRef());
    const lastSentMonth = (snapshot.data()?.lastSentMonth as string | undefined) ?? null;
    if (lastSentMonth === monthKey) return; // この月の分は送信済み

    const { staffEmail } = await getNotificationSettings();
    if (!staffEmail) return; // 通知先が未登録ならスキップ

    const reservations = await getReservationsInRangeOnce(start, end);

    // 未会計が残っているうちは送らず、次にアプリを開いたときに改めて判定する
    // (送信済みとして記録する前に判定するので、後日ちゃんと送られる)
    if (shouldDeferMonthlySummary(reservations, new Date())) return;

    const revenue = summarizeRevenue(reservations);
    const nomination = summarizeNomination(reservations);
    const salary = calculateStaffSalary(reservations);

    // 送信結果を確認できないため、試みた時点で「送信済み」として記録しておく
    // (通信が不安定な環境で毎回送り直そうとするのを防ぐ)
    await setDoc(monthlySummaryDocRef(), { lastSentMonth: monthKey }, { merge: true });

    await fetch(NOTIFY_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        secret: NOTIFY_SECRET,
        type: 'monthly-summary',
        staffEmail,
        monthLabel,
        totalRevenue: revenue.totalRevenue,
        customerCount: revenue.customerCount,
        averageSpend: revenue.averageSpend,
        nominationRate: nomination.nominationRate,
        nominatedCount: nomination.nominatedCount,
        salary: salary.salary,
      }),
    });
  } catch (err) {
    console.error('月次サマリーメールの送信に失敗しました', err);
  }
}
