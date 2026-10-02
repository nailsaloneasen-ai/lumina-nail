import { toDateString } from '../utils/format';
import { isCancelled } from './cancellation';
import type {
  BookingSourceSummary,
  NominationSummary,
  PaymentMethod,
  Reservation,
  RevenuePeriod,
  RevenueSummary,
  SalarySummary,
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
 * 前後の期間(先月・先週など)に移動したときの基準日を計算する。
 *
 * 月・年の移動では、基準日をその月/年の1日に揃えてから動かす。
 * 日付(31日など)のまま setMonth すると、移動先に同じ日が存在しない場合に
 * 翌月へはみ出してしまうため(例: 3月31日の1か月前 → 「2月31日」= 3月3日)。
 * 月・年の集計範囲は基準日の「年月」だけで決まるので、1日に揃えても結果は変わらない。
 */
export function shiftPeriodBaseDate(
  period: Exclude<RevenuePeriod, 'custom'>,
  baseDate: Date,
  direction: 1 | -1,
): Date {
  if (period === 'today') {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + direction);
    return next;
  }
  if (period === 'week') {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + direction * 7);
    return next;
  }
  if (period === 'month') {
    return new Date(baseDate.getFullYear(), baseDate.getMonth() + direction, 1);
  }
  return new Date(baseDate.getFullYear() + direction, 0, 1);
}

/**
 * 予約一覧から売上サマリーを集計する。
 * 集計対象は「会計済み(isPaid)」かつ「売上対象(isRevenueTarget)」の予約のみ。
 *
 * 売上(totalRevenue等)は施術金額(priceAmount)ベースで計算する。ポイント値引きは
 * 店にとっての売上を減らすものではなく、値引き分を店が負担しているだけなので、
 * 売上には影響しない(指名料はこの時点では関係しない)。
 * 一方、お客様が実際に支払った金額(ポイント値引き後、レジの現金照合などに使う実受取金額)は
 * actualReceived系として別枠で集計する。
 */
export function summarizeRevenue(reservations: Reservation[]): RevenueSummary {
  const targetReservations = reservations.filter(
    (r) => r.isPaid && r.payment && r.payment.isRevenueTarget,
  );

  let cashRevenue = 0;
  let cardRevenue = 0;
  let emoneyRevenue = 0;
  let actualReceivedCash = 0;
  let actualReceivedCard = 0;
  let actualReceivedEmoney = 0;
  let totalPointsUsed = 0;

  for (const reservation of targetReservations) {
    const payment = reservation.payment!;
    totalPointsUsed += payment.pointsUsed;

    if (payment.method === 'cash') {
      cashRevenue += reservation.priceAmount;
      actualReceivedCash += payment.paidAmount;
    } else if (payment.method === 'card') {
      cardRevenue += reservation.priceAmount;
      actualReceivedCard += payment.paidAmount;
    } else if (payment.method === 'emoney') {
      emoneyRevenue += reservation.priceAmount;
      actualReceivedEmoney += payment.paidAmount;
    }
  }

  const totalRevenue = cashRevenue + cardRevenue + emoneyRevenue;
  const actualReceivedTotal =
    actualReceivedCash + actualReceivedCard + actualReceivedEmoney;
  const customerCount = targetReservations.length;
  const averageSpend = customerCount > 0 ? Math.round(totalRevenue / customerCount) : 0;

  return {
    totalRevenue,
    cashRevenue,
    cardRevenue,
    emoneyRevenue,
    actualReceivedTotal,
    actualReceivedCash,
    actualReceivedCard,
    actualReceivedEmoney,
    totalPointsUsed,
    customerCount,
    averageSpend,
  };
}

/** 予約一覧から未会計の予約のみを抽出する(日時順) */
export function filterUnpaidReservations(reservations: Reservation[]): Reservation[] {
  // キャンセルされた予約は、会計の対象ではないので未会計に含めない
  return reservations
    .filter((r) => !r.isPaid && !isCancelled(r))
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
 * 売上は summarizeRevenue と同じく施術金額(priceAmount)ベース。
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
    const amount = reservation.priceAmount;
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

/** 消費税率(10%)。給与計算で「売上の半分」を税込とみなし税抜きに変換する際に使用する */
const CONSUMPTION_TAX_RATE = 0.1;

/** 指名1件あたりの給与ボーナス額(円)。このアプリの指名は常に従業員への指名 */
const NOMINATION_BONUS_PER_RESERVATION = 500;

/**
 * 従業員の給与を計算する。
 *
 * 計算方法:
 * 1. 対象期間の売上(施術金額ベース)を半分にする
 * 2. その半分を税込金額とみなし、税抜き額に変換する(1円未満は切り上げ)
 * 3. 指名1件につき500円のボーナスを、指名件数分加算する
 *    (このアプリでは指名=常に従業員への指名のため、指名件数がそのまま対象になる)
 *
 * salary = ceil(revenue / 2 / 1.1) + nominatedCount × 500
 */
export function calculateStaffSalary(reservations: Reservation[]): SalarySummary {
  const { totalRevenue: revenue } = summarizeRevenue(reservations);
  const { nominatedCount } = summarizeNomination(reservations);

  const half = revenue / 2;
  const taxExcludedHalf = Math.ceil(half / (1 + CONSUMPTION_TAX_RATE));
  const nominationBonus = nominatedCount * NOMINATION_BONUS_PER_RESERVATION;
  const salary = taxExcludedHalf + nominationBonus;

  return {
    revenue,
    half,
    taxExcludedHalf,
    nominatedCount,
    nominationBonus,
    salary,
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

/** 予約媒体が未設定(空文字)の予約をまとめる際の表示ラベル */
export const UNSPECIFIED_BOOKING_SOURCE_LABEL = '未設定';

/**
 * 予約一覧を予約媒体(ホットペッパー・ミニモ・ネイリーなど)ごとに集計する。
 * 集計対象は summarizeRevenue と同じく「会計済み・売上対象」の予約のみ。
 * 売上は施術金額(priceAmount)ベース。媒体未設定の予約は「未設定」としてまとめる。
 * 売上の多い順に並べて返す。
 */
export function summarizeBySource(reservations: Reservation[]): BookingSourceSummary[] {
  const targetReservations = reservations.filter(
    (r) => r.isPaid && r.payment && r.payment.isRevenueTarget,
  );

  const bySource = new Map<
    string,
    {
      count: number;
      revenue: number;
      cashRevenue: number;
      cardRevenue: number;
      emoneyRevenue: number;
    }
  >();

  for (const reservation of targetReservations) {
    const source = reservation.bookingSource || UNSPECIFIED_BOOKING_SOURCE_LABEL;
    const current = bySource.get(source) ?? {
      count: 0,
      revenue: 0,
      cashRevenue: 0,
      cardRevenue: 0,
      emoneyRevenue: 0,
    };
    current.count += 1;
    current.revenue += reservation.priceAmount;

    const method = reservation.payment!.method;
    if (method === 'cash') current.cashRevenue += reservation.priceAmount;
    else if (method === 'card') current.cardRevenue += reservation.priceAmount;
    else if (method === 'emoney') current.emoneyRevenue += reservation.priceAmount;

    bySource.set(source, current);
  }

  return Array.from(bySource.entries())
    .map(([source, values]) => ({ source, ...values }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** 指定した予約媒体の予約一覧を、新しい順に絞り込む(詳細モーダル用) */
export function filterBySource(
  reservations: Reservation[],
  source: string,
): Reservation[] {
  return reservations
    .filter((r) => {
      if (!r.isPaid || !r.payment || !r.payment.isRevenueTarget) return false;
      const reservationSource = r.bookingSource || UNSPECIFIED_BOOKING_SOURCE_LABEL;
      return reservationSource === source;
    })
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
}
