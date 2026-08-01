import type { PaymentMethod, Reservation } from '../types';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: '現金',
  card: 'カード',
  emoney: '電子マネー',
};

/**
 * CSVの1つの値を安全な形にする(カンマ・改行・ダブルクォートを含む場合はエスケープする)
 */
function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (text.includes(',') || text.includes('\n') || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsvRow(cells: (string | number)[]): string {
  return cells.map(escapeCsvCell).join(',');
}

/**
 * 期間内の会計済み(売上対象)予約一覧から、売上明細CSVを生成する。
 * Excelでの文字化けを防ぐため、先頭にUTF-8のBOMを付与している。
 */
export function generateRevenueCsv(reservations: Reservation[]): string {
  const targetReservations = reservations
    .filter((r) => r.isPaid && r.payment && r.payment.isRevenueTarget)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  const header = toCsvRow([
    '日付',
    '顧客名',
    '施術金額',
    'ポイント利用',
    '支払金額',
    '支払い方法',
  ]);

  const rows = targetReservations.map((r) => {
    const payment = r.payment!;
    return toCsvRow([
      r.date,
      r.customerName,
      r.priceAmount,
      payment.pointsUsed,
      payment.paidAmount,
      PAYMENT_METHOD_LABELS[payment.method],
    ]);
  });

  const BOM = '\uFEFF';
  return BOM + [header, ...rows].join('\n');
}

/** ブラウザ上でCSV文字列をファイルとしてダウンロードさせる */
export function downloadCsvFile(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
