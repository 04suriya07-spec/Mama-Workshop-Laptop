'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getDashboardStats, getAllJobs, getAllVehicles, getAllCustomers,
  getAllWorkers, Job, Vehicle, Customer, Worker
} from '@/lib/db';
import { formatCurrency } from '@/lib/currency';
import MorningBriefingModal from '@/components/ai/MorningBriefingModal';
import AiCameraScannerModal from '@/components/scanner/AiCameraScannerModal';

// ─── Inline SVG icons ────────────────────────────────────────────────────────
const IconMic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
    <path d="M19 10v2a7 7 0 01-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const IconTrendUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const IconTrendDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    <polyline points="17 18 23 18 23 12"/>
  </svg>
);

const IconWorkers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconWrench = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </svg>
);

const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// ─── Greeting ────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 48 }} className="stagger">
      <div className="skeleton skeleton-card" style={{ height: 60, borderRadius: 16, marginBottom: 20 }} />
      <div className="skeleton skeleton-card" style={{ height: 160, marginBottom: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div className="skeleton" style={{ height: 90, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 90, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 90, borderRadius: 16 }} />
      </div>
      <div className="skeleton" style={{ height: 56, borderRadius: 16, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 72, borderRadius: 14, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 72, borderRadius: 14 }} />
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    revenue: 0, expenses: 0, profit: 0,
    receivables: 0, payables: 0,
    activeJobsCount: 0, lowStockCount: 0, todayJobsCount: 0,
  });
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const load = async () => {
    try {
      const [dashStats, allJobs, allVehs, allCusts, allWrks] = await Promise.all([
        getDashboardStats(),
        getAllJobs(),
        getAllVehicles(),
        getAllCustomers(),
        getAllWorkers(),
      ]);
      setStats(dashStats);
      setActiveJobs(allJobs.filter(j => j.status === 'active' || j.status === 'estimate').slice(0, 3));
      setVehicles(allVehs);
      setCustomers(allCusts);
      setWorkers(allWrks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener('troyz_data_updated', onUpdate);
    return () => window.removeEventListener('troyz_data_updated', onUpdate);
  }, []);

  const triggerVoice = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mew_open_voice'));
    }
  };

  if (loading) return <DashboardSkeleton />;

  const getVehicleReg = (vehicleId: string) => vehicles.find(v => v.id === vehicleId)?.regNo ?? 'Rig Unit';
  const getCustomerName = (customerId: string) => customers.find(c => c.id === customerId)?.name ?? 'Customer';
  const activeStaff = workers.filter(w => w.isActive).length;

  const incomeRatio = stats.revenue + stats.expenses > 0
    ? (stats.revenue / (stats.revenue + stats.expenses)) * 100
    : 50;

  const statusBadge = (status: string) => {
    if (status === 'active') return { label: 'Active', cls: 'badge-brand' };
    if (status === 'complete') return { label: 'Done', cls: 'badge-success' };
    if (status === 'estimate') return { label: 'Estimate', cls: 'badge-muted' };
    return { label: status, cls: 'badge-muted' };
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 56 }} className="animate-fade-in">

      {/* ── GREETING ROW ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            {getGreeting()} ·{' '}
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
          <div className="t-h2" style={{ marginTop: 2 }}>Workshop Overview</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsBriefingOpen(true)}
            style={{
              height: 42,
              padding: '0 14px',
              borderRadius: 21,
              background: 'linear-gradient(135deg, #FF9500 0%, #FF5E00 100%)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(255, 149, 0, 0.35)',
              color: 'white',
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            <span>🌅 Audio Briefing</span>
          </button>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border-medium)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              fontSize: 18,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
            title="Scan Number Plate or Bill"
          >
            📸
          </button>
        </div>
      </div>

      {/* ── HERO FINANCIAL CARD ── */}
      <div className="hero-card mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="t-label">Net Profit · Month</span>
          <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 8px' }}>
            Live
          </span>
        </div>

        {/* Big number */}
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 38, fontWeight: 900,
            letterSpacing: '-0.05em',
            lineHeight: 1.05,
            fontVariantNumeric: 'tabular-nums',
            color: stats.profit >= 0 ? 'var(--text-primary)' : 'var(--danger)',
            marginTop: 8, marginBottom: 16,
          }}
        >
          {formatCurrency(stats.profit)}
        </div>

        {/* Income vs Expenses visual bar */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div className="flex justify-between mb-2">
            <div>
              <div className="t-label">Income</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginTop: 2 }}>
                {formatCurrency(stats.revenue)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="t-label">Expenses</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginTop: 2 }}>
                {formatCurrency(stats.expenses)}
              </div>
            </div>
          </div>
          {/* Split progress bar */}
          <div className="stat-bar-wrap">
            <div
              className="stat-bar-fill"
              style={{
                width: `${incomeRatio}%`,
                background: 'linear-gradient(90deg, var(--success), #16A34A)',
              }}
            />
          </div>
        </div>

        {/* Action CTAs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
          <Link
            href="/customers"
            className="btn btn-surface btn-sm"
            style={{ justifyContent: 'center', fontSize: 12.5 }}
          >
            <IconPlus /> Customer Advance
          </Link>
          <Link
            href="/money"
            className="btn btn-surface btn-sm"
            style={{ justifyContent: 'center', fontSize: 12.5 }}
          >
            <IconPlus /> Record Expense
          </Link>
        </div>
      </div>

      {/* ── VOICE STRIP ── */}
      <div
        className="voice-fab-strip mb-4"
        onClick={triggerVoice}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && triggerVoice()}
        aria-label="Open voice assistant"
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', flexShrink: 0,
            boxShadow: 'var(--brand-glow)',
          }}
        >
          <IconMic />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Tamil Voice Assistant
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
            "கஸ்டமருக்கு ₹50,000 அட்வான்ஸ்" · Tap &amp; speak
          </div>
        </div>
        <div className="equalizer-wrap" style={{ opacity: 0.7 }}>
          {[0,1,2,3].map(i => (
            <div
              key={i}
              className="equalizer-bar"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      </div>

      {/* ── 3 KPI TILES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <Link
          href="/employees"
          className="kpi-tile kpi-tile-blue"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="kpi-icon">
            <IconWorkers />
          </div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{activeStaff}</div>
          <div className="kpi-label">Team</div>
        </Link>

        <Link
          href="/work"
          className="kpi-tile kpi-tile-amber"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="kpi-icon">
            <IconWrench />
          </div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{stats.activeJobsCount}</div>
          <div className="kpi-label">In Bay</div>
        </Link>

        <Link
          href="/customers"
          className="kpi-tile kpi-tile-green"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="kpi-icon">
            <IconAlert />
          </div>
          <div className="kpi-value" style={{ fontSize: 16, letterSpacing: '-0.02em' }}>
            {formatCurrency(stats.receivables)}
          </div>
          <div className="kpi-label">To Collect</div>
        </Link>
      </div>

      {/* ── ACTIVE JOBS SECTION ── */}
      {activeJobs.length > 0 && (
        <div className="mb-6">
          <div className="section-header">
            <span className="section-title">Live in Workshop Bay</span>
            <Link href="/work" className="section-action">
              All Jobs →
            </Link>
          </div>

          <div className="card" style={{ padding: '4px 16px' }}>
            {activeJobs.map((job, idx) => {
              const badge = statusBadge(job.status);
              return (
                <Link
                  key={job.id}
                  href={`/work/detail?id=${job.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    className="txn-row"
                    style={{ borderBottom: idx < activeJobs.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    {/* Icon */}
                    <div
                      className="txn-icon"
                      style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}
                    >
                      <IconWrench />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {getVehicleReg(job.vehicleId)}
                        </span>
                        <span className={`badge ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getCustomerName(job.customerId)} · {job.complaint || 'Bore Rig Service'}
                      </div>
                    </div>

                    {/* Amount + chevron */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                        {formatCurrency(job.total)}
                      </span>
                      <IconChevronRight />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EMPTY ACTIVE JOBS ── */}
      {activeJobs.length === 0 && (
        <div className="card">
          <div className="empty-state" style={{ padding: '28px 16px' }}>
            <div className="empty-state-icon">
              <IconWrench />
            </div>
            <div className="empty-state-title">No active jobs</div>
            <div className="empty-state-sub">Workshop bay is clear. Add a new job to get started.</div>
            <Link href="/work/new" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
              <IconPlus /> New Job Card
            </Link>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {isBriefingOpen && (
        <MorningBriefingModal onClose={() => setIsBriefingOpen(false)} />
      )}

      {isScannerOpen && (
        <AiCameraScannerModal onClose={() => setIsScannerOpen(false)} />
      )}

    </div>
  );
}
