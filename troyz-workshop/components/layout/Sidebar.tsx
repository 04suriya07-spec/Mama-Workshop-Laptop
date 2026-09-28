'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

const IconWorkers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
    <path d="M12 3v2M8.5 5.5l1.5 1.5M15.5 5.5L14 7"/>
  </svg>
);

const IconBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const IconTruck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/>
    <path d="M16 8h4l3 3v5h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

const IconBarChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10"/>
    <line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
);

const IconWallet = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2v-6z"/>
    <path d="M20 12H14a2 2 0 000 4h6"/>
  </svg>
);

const IconWrench = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </svg>
);

const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const IconMic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
    <path d="M19 10v2a7 7 0 01-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const NAV_MAIN: NavItem[] = [
  { icon: <IconHome />, label: 'Dashboard', href: '/' },
  { icon: <IconUsers />, label: 'Customers', href: '/customers' },
  { icon: <IconWorkers />, label: 'Employees', href: '/employees' },
  { icon: <IconWrench />, label: 'Work Orders', href: '/work' },
];

const NAV_FINANCES: NavItem[] = [
  { icon: <IconWallet />, label: 'Money', href: '/money' },
  { icon: <IconBox />, label: 'Stock', href: '/stock' },
  { icon: <IconTruck />, label: 'Suppliers', href: '/suppliers' },
  { icon: <IconBarChart />, label: 'Reports', href: '/reports' },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function NavLink({ item, collapsed, isActive, onClose }: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      href={item.href}
      className={`nav-item ${isActive ? 'active' : ''}`}
      onClick={onClose}
      title={collapsed ? item.label : undefined}
      style={collapsed ? { justifyContent: 'center' } : undefined}
    >
      <span className="nav-icon-wrap">{item.icon}</span>
      {!collapsed && <span className="nav-label">{item.label}</span>}
    </Link>
  );
}

export default function Sidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <IconWrench />
        </div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">MEW</div>
            <div className="sidebar-logo-sub">Mithra Engineering Works</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {!collapsed && <div className="nav-section-label">Operations</div>}

        {NAV_MAIN.map(item => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            isActive={isActive(item.href)}
            onClose={onMobileClose}
          />
        ))}

        {!collapsed && <div className="nav-section-label" style={{ marginTop: 8 }}>Finances</div>}
        {collapsed && <div style={{ height: 12 }} />}

        {NAV_FINANCES.map(item => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            isActive={isActive(item.href)}
            onClose={onMobileClose}
          />
        ))}

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
          <Link
            href="/settings"
            className={`nav-item ${pathname.startsWith('/settings') ? 'active' : ''}`}
            onClick={onMobileClose}
            title={collapsed ? 'Settings' : undefined}
            style={collapsed ? { justifyContent: 'center' } : undefined}
          >
            <span className="nav-icon-wrap"><IconSettings /></span>
            {!collapsed && <span className="nav-label">Settings</span>}
          </Link>
        </div>
      </nav>

      {/* Status pill */}
      {!collapsed && (
        <div className="sidebar-bottom">
          <div className="sidebar-workshop-pill">
            <div className="sidebar-status-dot" />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Workshop Online
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Live data synced</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
