import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import ReservationListItem from '../components/ReservationListItem';
import { searchReservationsByCustomerName } from '../lib/reservations';
import { formatDateJP } from '../utils/format';
import type { Reservation } from '../types';

/**
 * 予約検索画面
 * -----------------------------------------------------------------------
 * 顧客名・読み仮名の前方一致で、日付をまたいで予約を横断検索できる。
 * 閲覧のみの機能のため、オーナー・従業員どちらも利用可能。
 * -----------------------------------------------------------------------
 */
export default function SearchPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Reservation[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!keyword.trim()) {
      setResults(null);
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    try {
      const data = await searchReservationsByCustomerName(keyword);
      setResults(data);
    } catch {
      setErrorMessage('検索に失敗しました。通信環境をご確認ください。');
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppHeader title="予約検索" />

      <main className="px-5 -mt-2 pt-6 space-y-4">
        <form onSubmit={handleSubmit} className="glass-card p-4 flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="顧客名または読み仮名で検索"
            className="flex-1 rounded-xl border border-lumina-blush bg-white/80 px-4 py-3
                       text-base text-ink outline-none focus:border-lumina-pink-deep
                       focus:ring-2 focus:ring-lumina-pink/40"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="shrink-0 brand-gradient rounded-xl px-5 text-sm font-medium text-white
                       disabled:opacity-60 active:opacity-90 transition-opacity"
          >
            {isSearching ? '検索中…' : '検索'}
          </button>
        </form>

        <p className="text-xs text-ink-soft px-1">
          ※名前の最初の数文字を入力してください(部分一致・あいまい検索には対応していません)
        </p>

        {errorMessage && (
          <p className="text-sm text-lumina-pink-deep text-center">{errorMessage}</p>
        )}

        {results !== null && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-ink">検索結果</p>
              <span className="text-xs text-ink-soft">{results.length}件</span>
            </div>

            {results.length === 0 ? (
              <p className="text-sm text-ink-soft py-6 text-center">
                該当する予約が見つかりませんでした
              </p>
            ) : (
              <div className="space-y-3">
                {results.map((reservation) => (
                  <div key={reservation.id}>
                    <p className="text-[11px] text-ink-soft mb-1 px-1">
                      {formatDateJP(reservation.date)}
                    </p>
                    <ReservationListItem
                      reservation={reservation}
                      onClick={(r) => navigate(`/reservation/${r.id}`)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
