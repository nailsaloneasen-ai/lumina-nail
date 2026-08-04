import { toDateString } from '../utils/format';
import type {
  NominationSummary,
  PaymentMethod,
  Reservation,
  RevenuePeriod,
  RevenueSummary,
} from '../types';

/**
 * 売上集計まわりのロジック
 * -----------------------------------------------------------------------
 * 売上画面(オーナー専用)で使う、期間指定・集計計算をまとめる。
 * -----------------------------------------------------------------------
 */

/** 指定した期間種別(今日/週/今月/年)に対応する日付範囲(YYYY-MM-DD)を計算する */
export function dateRangeForPeriod(
  period: RevenuePeriod,
  baseDate: Date = new Date(),
): { start: string; end: string } {
  if (period === 'today') {
    const today = toDateString(baseDate);
    return { start: today, end: today };
  }

  if (period === 'week') {
    // 日曜始まり〜土曜終わりの週(カレンダー画面の週表示と揃えている)
    const startOfWeek = new Date(baseDate);
    startOfWeek.setDate(baseDate.getDate() - baseDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return { start: toDateString(startOfWeek), end: toDateString(endOfWeek) };
  }

  if (period === 'month') {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const start = toDateString(new Date(year, month, 1));
    const end = toDateString(new Date(year, month + 1, 0));
    return { start, end };
  }

  // year
  const year = baseDate.getFullYear();
  const start = toDateString(new Date(year, 0, 1));
  const end = toDateString(new Date(year, 11, 31));
  return { start, end };
}

/**
 * 予約一覧から売上サマリーを集計する。
 * 集計対象は「会計済み(isPaid)」かつ「売上対象(isRevenueTarget)」の予約のみ。
 */
export function summarizeRevenue(reservations: Reservation[]): RevenueSummary {
  const targetReservations = reservations.filter(
    (r) => r.isPaid && r.payment && r.payment.isRevenueTarget,
  );

  let cashRevenue = 0;
  let cardRevenue = 0;
  let emoneyRevenue = 0;
  let totalPointsUsed = 0;

  for (const reservation of targetReservations) {
    const payment = reservation.payment!;
    totalPointsUsed += payment.pointsUsed;

    if (payment.method === 'cash') cashRevenue += payment.paidAmount;
    else if (payment.method === 'card') cardRevenue += payment.paidAmount;
    else if (payment.method === 'emoney') emoneyRevenue += payment.paidAmount;
  }

  const totalRevenue = cashRevenue + cardRevenue + emoneyRevenue;
  const customerCount = targetReservations.length;
  const averageSpend = customerCount > 0 ? Math.round(totalRevenue / customerCount) : 0;

  return {
    totalRevenue,
    cashRevenue,
    cardRevenue,
    emoneyRevenue,
    totalPointsUsed,
    customerCount,
    averageSpend,
  };
}

/** 予約一覧から未会計の予約のみを抽出する(日時順) */
export function filterUnpaidReservations(reservations: Reservation[]): Reservation[] {
  return reservations
    .filter((r) => !r.isPaid)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

/**
 * 予約一覧から、指定した支払い方法で会計済み(かつ売上対象)の予約のみを抽出する。
 * 売上画面で「現金」「カード」「電子マネー」の内訳をタップした際の詳細表示に使用する。
 * 日付の新しい順に並べる。
 */
export function filterPaidByMethod(
  reservations: Reservation[],
  method: PaymentMethod,
): Reservation[] {
  return reservations
    .filter(
      (r) =>
        r.isPaid && r.payment && r.payment.isRevenueTarget && r.payment.method === method,
    )
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
}

/**
 * 予約一覧から、ポイントを利用して会計済み(かつ売上対象)の予約のみを抽出する。
 * 売上画面で「ポイント利用」をタップした際の詳細表示(誰がいつ何ポイント使ったか)に使用する。
 * 日付の新しい順に並べる。
 */
export function filterPointsUsage(reservations: Reservation[]): Reservation[] {
  return reservations
    .filter(
      (r) =>
        r.isPaid && r.payment && r.payment.isRevenueTarget && r.payment.pointsUsed > 0,
    )
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
}

/**
 * 予約一覧から、指名の有無別に客数・売上・指名率を集計する。
 * 集計対象は summarizeRevenue と同じく「会計済み・売上対象」の予約のみ。
 */
export function summarizeNomination(reservations: Reservation[]): NominationSummary {
  const targetReservations = reservations.filter(
    (r) => r.isPaid && r.payment && r.payment.isRevenueTarget,
  );

  let nominatedCount = 0;
  let nominatedRevenue = 0;
  let notNominatedCount = 0;
  let notNominatedRevenue = 0;

  for (const reservation of targetReservations) {
    const amount = reservation.payment!.paidAmount;
    if (reservation.isNominated) {
      nominatedCount += 1;
      nominatedRevenue += amount;
    } else {
      notNominatedCount += 1;
      notNominatedRevenue += amount;
    }
  }

  const totalCount = nominatedCount + notNominatedCount;
  const nominationRate =
    totalCount > 0 ? Math.round((nominatedCount / totalCount) * 100) : 0;

  return {
    nominatedCount,
    nominatedRevenue,
    notNominatedCount,
    notNominatedRevenue,
    nominationRate,
  };
}

/**
 * 予約一覧から、指名の有無で絞り込んだ予約一覧を抽出する(会計済み・売上対象のみ)。
 * 売上画面で指名件数をタップした際の内訳表示に使用する。日付の新しい順に並べる。
 */
export function filterByNomination(
  reservations: Reservation[],
  isNominated: boolean,
): Reservation[] {
  return reservations
    .filter(
      (r) =>
        r.isPaid &&
        r.payment &&
        r.payment.isRevenueTarget &&
        r.isNominated === isNominated,
    )
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
}
