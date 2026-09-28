'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ─── Apple SF-Style Vector Icons ─────────────────────────────────────────────
const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ width: 22, height: 22 }}>
    <path d="M12 2.5a1 1 0 0 0-.64.23l-8 6.5A1 1 0 0 0 3 10v10a2 2 0 0 0 2 2h4.5a1 1 0 0 0 1-1v-5a1.5 1.5 0 0 1 3 0v5a1 1 0 0 0 1 1H19a2 2 0 0 0 2-2V10a1 1 0 0 0-.36-.77l-8-6.5a1 1 0 0 0-.64-.23z"/>
  </svg>
);

const IconClients = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ width: 22, height: 22 }}>
    <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2c-3.87 0-7 2.13-7 5v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1c0-2.87-3.13-5-7-5z"/>
  </svg>
);

const IconTeam = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ width: 22, height: 22 }}>
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

const IconMoney = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ width: 22, height: 22 }}>
    <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-1 9h-3a2 2 0 0 1 0-4h3v4zm0-6H4V6h15v1z"/>
  </svg>
);

const IconMic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

export default function MobileBottomNav() {
  const pathname = usePathname();

  const tabsLeft = [
    { href: '/', label: 'Home', Icon: IconHome, active: pathname === '/' },
    { href: '/customers', label: 'Clients', Icon: IconClients, active: pathname.startsWith('/customers') },
  ];

  const tabsRight = [
    { href: '/employees', label: 'Team', Icon: IconTeam, active: pathname.startsWith('/employees') },
    { href: '/money', label: 'Money', Icon: IconMoney, active: pathname.startsWith('/money') },
  ];

  const openVoice = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mew_open_voice'));
    }
  };

  return (
    <nav className="mobile-bottom-nav">
      <div className="mobile-bottom-nav-inner">
        {/* Left Tabs */}
        <div className="mobile-nav-group">
          {tabsLeft.map(({ href, label, Icon, active }) => (
            <Link
              key={href}
              href={href}
              className={`mobile-nav-item ${active ? 'active' : ''}`}
            >
              <div className="mobile-nav-icon-box">
                <Icon />
              </div>
              <span className="mobile-nav-label">{label}</span>
              {active && <div className="mobile-nav-active-glow" />}
            </Link>
          ))}
        </div>

        {/* Center Prominent Voice Hub */}
        <div className="mobile-nav-voice-slot">
          <button
            type="button"
            className="mobile-voice-btn"
            onClick={openVoice}
            aria-label="Open Voice AI"
          >
            <div className="mobile-voice-btn-pulse" />
            <IconMic />
          </button>
        </div>

        {/* Right Tabs */}
        <div className="mobile-nav-group">
          {tabsRight.map(({ href, label, Icon, active }) => (
            <Link
              key={href}
              href={href}
              className={`mobile-nav-item ${active ? 'active' : ''}`}
            >
              <div className="mobile-nav-icon-box">
                <Icon />
              </div>
              <span className="mobile-nav-label">{label}</span>
              {active && <div className="mobile-nav-active-glow" />}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
