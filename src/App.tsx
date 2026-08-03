import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginPage from './pages/LoginPage';
import LoadingScreen from './components/LoadingScreen';
import OfflineBanner from './components/OfflineBanner';

/**
 * 画面ごとの遅延読み込み(コード分割)
 * -----------------------------------------------------------------------
 * ログイン画面(LoginPage)以外の各画面は、最初のアクセス時に一括で
 * ダウンロードするのではなく、実際にその画面を開いたタイミングで
 * 必要な分だけダウンロードするようにしている。これにより、
 * 特に電波の弱い環境での初回読み込みが速くなる。
 *
 * LoginPageだけは、未ログイン時に最初に必ず表示される画面のため、
 * 遅延読み込みにせず最初から読み込んでいる。
 * -----------------------------------------------------------------------
 */
const HomePage = lazy(() => import('./pages/HomePage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ReservationListPage = lazy(() => import('./pages/ReservationListPage'));
const ReservationDetailPage = lazy(() => import('./pages/ReservationDetailPage'));
const ReservationFormPage = lazy(() => import('./pages/ReservationFormPage'));
const AccountingPage = lazy(() => import('./pages/AccountingPage'));
const RevenuePage = lazy(() => import('./pages/RevenuePage'));
const ReservationHistoryPage = lazy(() => import('./pages/ReservationHistoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PasswordChangePage = lazy(() => import('./pages/PasswordChangePage'));
const BackupPage = lazy(() => import('./pages/BackupPage'));
const TrashPage = lazy(() => import('./pages/TrashPage'));

/**
 * 認証状態に応じて画面を出し分ける本体部分。
 * AuthProviderの内側でのみuseAuthが使えるため、Appとは別コンポーネントに分離している。
 */
function AppContent() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <>
        <OfflineBanner />
        <LoginPage />
      </>
    );
  }

  return (
    <>
      <OfflineBanner />
      {/* location.pathnameをkeyにすることで、画面が切り替わるたびに
          page-transitionアニメーションが再生される */}
      <div key={location.pathname} className="page-transition">
        {/* 遅延読み込み中(画面のダウンロード待ち)はローディング画面を表示する */}
        <Suspense fallback={<LoadingScreen />}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/reservations/:date" element={<ReservationListPage />} />
            <Route path="/reservations/:date/new" element={<ReservationFormPage />} />
            <Route path="/reservation/:id" element={<ReservationDetailPage />} />
            <Route path="/reservation/:id/edit" element={<ReservationFormPage />} />
            <Route path="/reservation/:id/pay" element={<AccountingPage />} />
            <Route
              path="/reservation/:id/history"
              element={<ReservationHistoryPage />}
            />
            <Route path="/revenue" element={<RevenuePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/password" element={<PasswordChangePage />} />
            <Route path="/settings/backup" element={<BackupPage />} />
            <Route path="/settings/trash" element={<TrashPage />} />
          </Routes>
        </Suspense>
      </div>
    </>
  );
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
