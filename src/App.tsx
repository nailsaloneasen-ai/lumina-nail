import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CalendarPage from './pages/CalendarPage';
import SearchPage from './pages/SearchPage';
import ReservationListPage from './pages/ReservationListPage';
import ReservationDetailPage from './pages/ReservationDetailPage';
import ReservationFormPage from './pages/ReservationFormPage';
import AccountingPage from './pages/AccountingPage';
import RevenuePage from './pages/RevenuePage';
import ReservationHistoryPage from './pages/ReservationHistoryPage';
import SettingsPage from './pages/SettingsPage';
import PasswordChangePage from './pages/PasswordChangePage';
import BackupPage from './pages/BackupPage';
import TrashPage from './pages/TrashPage';
import LoadingScreen from './components/LoadingScreen';
import OfflineBanner from './components/OfflineBanner';

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
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/reservations/:date" element={<ReservationListPage />} />
          <Route path="/reservations/:date/new" element={<ReservationFormPage />} />
          <Route path="/reservation/:id" element={<ReservationDetailPage />} />
          <Route path="/reservation/:id/edit" element={<ReservationFormPage />} />
          <Route path="/reservation/:id/pay" element={<AccountingPage />} />
          <Route path="/reservation/:id/history" element={<ReservationHistoryPage />} />
          <Route path="/revenue" element={<RevenuePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/password" element={<PasswordChangePage />} />
          <Route path="/settings/backup" element={<BackupPage />} />
          <Route path="/settings/trash" element={<TrashPage />} />
        </Routes>
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
