'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/':          'Dashboard',
  '/customers': 'Customers',
  '/money':     'Money',
  '/stock':     'Stock',
  '/suppliers': 'Suppliers',
  '/employees': 'Employees',
  '/reports':   'Reports',
  '/settings':  'Settings',
  '/work':      'Work Orders',
  '/voice':     'Voice AI',
};

const IconWrench = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </svg>
);

const IconMenu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// ─── Apple Sun & Moon Glyphs ──────────────────────────────────────────────────
const IconSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: '#FFA033' }}>
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const IconMoon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, color: '#6366F1' }}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

interface HeaderProps {
  title?: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}

export default function Header({ sidebarCollapsed, onToggleSidebar, onOpenMobileSidebar }: HeaderProps) {
  const pathname = usePathname();
  const baseRoute = '/' + (pathname.split('/')[1] || '');
  const title = PAGE_TITLES[baseRoute] || 'MEW';

  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [shiftInfo, setShiftInfo] = useState({ label: 'Live', dotColor: '#30D158' });
  const [isOnline, setIsOnline] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load and apply persisted theme
  useEffect(() => {
    const savedTheme = (localStorage.getItem('mew_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    try {
      const native = (window as any).MewNative || (window as any).AndroidNativeVoice;
      if (native && native.setTheme) {
        native.setTheme(savedTheme);
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('mew_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      const native = (window as any).MewNative || (window as any).AndroidNativeVoice;
      if (native && native.setTheme) {
        native.setTheme(nextTheme);
      }
    } catch {}
  };

  useEffect(() => {
    const updateTimeAndShift = () => {
      const now = new Date();
      setDateStr(now.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }));

      setTimeStr(now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }));

      const hours = now.getHours();
      const minutes = now.getMinutes();
      const decimalTime = hours + minutes / 60;

      if (decimalTime >= 8.5 && decimalTime < 13.5) {
        setShiftInfo({ label: 'Morning Bay', dotColor: '#30D158' });
      } else if (decimalTime >= 13.5 && decimalTime < 18.5) {
        setShiftInfo({ label: 'Peak Shift', dotColor: '#FF9F0A' });
      } else if (decimalTime >= 18.5 && decimalTime < 20.5) {
        setShiftInfo({ label: 'Closing Ops', dotColor: '#A78BFA' });
      } else {
        setShiftInfo({ label: 'Off Hours', dotColor: '#636366' });
      }
    };

    updateTimeAndShift();
    const timer = setInterval(updateTimeAndShift, 10000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  return (
    <header className={`header ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Toggle (desktop) */}
      <button
        className="btn btn-icon btn-ghost desktop-only"
        onClick={onToggleSidebar}
        title="Toggle sidebar"
        id="sidebar-toggle"
        style={{ marginRight: -4 }}
      >
        <IconMenu />
      </button>

      {/* Mobile — menu button */}
      <button
        className="btn btn-icon btn-ghost mobile-only"
        onClick={onOpenMobileSidebar}
        aria-label="Open menu"
        id="mobile-menu-btn"
        style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'var(--border)',
          border: '1px solid var(--border-medium)',
        }}
      >
        <IconMenu />
      </button>

      {/* Brand icon (mobile) */}
      <div className="mobile-only" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className="header-brand-icon">
          <IconWrench />
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>MEW</span>
      </div>

      {/* Page title (desktop) */}
      <div className="header-title desktop-only">{title}</div>

      {/* Center Dynamic Island Shift & Clock Capsule */}
      <div className="header-dynamic-capsule">
        <div
          className="header-capsule-dot"
          style={{ background: isOnline ? shiftInfo.dotColor : '#FF453A' }}
        />
        <span className="header-capsule-shift">
          {isOnline ? shiftInfo.label : 'Offline'}
        </span>
        <span className="header-capsule-divider">·</span>
        <span className="header-capsule-time">
          {timeStr || 'Live'}
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Date (desktop) */}
      <div className="header-date desktop-only">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {dateStr}
      </div>

      {/* New Job (desktop) */}
      <Link href="/work/new" className="btn btn-primary btn-sm desktop-only" id="new-job-btn">
        <IconPlus />
        New Job
      </Link>

      {/* ─── APPLE DARK / LIGHT MODE SWITCH BUTTON ─── */}
      <button
        type="button"
        onClick={toggleTheme}
        className="header-theme-toggle"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label="Toggle dark/light mode"
        id="theme-toggle-btn"
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          border: theme === 'dark' ? '1.5px solid rgba(255, 160, 51, 0.35)' : '1.5px solid rgba(99, 102, 241, 0.35)',
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, rgba(255, 160, 51, 0.15) 0%, rgba(20, 22, 35, 0.9) 100%)' 
            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(255, 255, 255, 0.9) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: theme === 'dark' ? '0 2px 10px rgba(255, 160, 51, 0.2)' : '0 2px 10px rgba(99, 102, 241, 0.15)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {theme === 'dark' ? <IconSun /> : <IconMoon />}
      </button>
    </header>
  );
}
