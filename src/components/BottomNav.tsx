import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * 画面下部固定のタブナビゲーション。
 * 「売上」「設定」タブはオーナーのみ表示。
 */
export default function BottomNav() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors ${
      isActive ? 'text-lumina-pink-deep font-medium' : 'text-ink-soft'
    }`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-10 flex bg-white/85 backdrop-blur-lg
                 border-t border-lumina-blush pb-[env(safe-area-inset-bottom)]"
    >
      <NavLink to="/" end className={linkClass}>
        <HomeIcon />
        ホーム
      </NavLink>
      <NavLink to="/calendar" className={linkClass}>
        <CalendarIcon />
        カレンダー
      </NavLink>
      {isOwner && (
        <NavLink to="/revenue" className={linkClass}>
          <RevenueIcon />
          売上
        </NavLink>
      )}
      {isOwner && (
        <NavLink to="/settings" className={linkClass}>
          <SettingsIcon />
          設定
        </NavLink>
      )}
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 11.5L12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-5.5h4V20h3a1 1 0 0 0 1-1v-9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="5.5"
        width="16"
        height="14.5"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M4 9.5h16M8 3.5v3M16 3.5v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 19V5M4 19h16M8 15v-4M12 15V7M16 15v-7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M17.66 6.34l-1.42 1.42M7.76 16.24l-1.42 1.42M17.66 17.66l-1.42-1.42M7.76 7.76 6.34 6.34"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
