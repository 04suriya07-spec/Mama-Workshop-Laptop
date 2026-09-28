'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllJobs, getAllCustomers, getAllVehicles, deleteJob, Job, Customer, Vehicle } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/currency';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconWrench = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default function WorkPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    Promise.all([getAllJobs(), getAllCustomers(), getAllVehicles()])
      .then(([j, c, v]) => {
        setJobs(j);
        setCustomers(c);
        setVehicles(v);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const h = () => loadData();
    window.addEventListener('troyz_data_updated', h);
    return () => window.removeEventListener('troyz_data_updated', h);
  }, []);

  const getCustomer = (custId?: string) => customers.find(c => c.id === custId);
  const getVehicle = (vehId?: string) => vehicles.find(v => v.id === vehId);

  const handleDelete = async (id: string, jobNo: string, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (confirm(`Delete job card "${jobNo}"? This cannot be undone.`)) {
      await deleteJob(id);
      loadData();
    }
  };

  const filteredJobs = jobs.filter(j => {
    const cust = getCustomer(j.customerId);
    const veh = getVehicle(j.vehicleId);
    const matchesStatus = filterStatus === 'all' || j.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      j.jobNo.toLowerCase().includes(q) ||
      (j.complaint && j.complaint.toLowerCase().includes(q)) ||
      (cust && cust.name.toLowerCase().includes(q)) ||
      (veh && veh.regNo.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const activeInBay = jobs.filter(j => j.status === 'active').length;
  const totalReceivables = jobs.reduce((sum, j) => sum + (j.status !== 'cancelled' ? j.balance : 0), 0);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-warning" style={{ fontSize: 10 }}>In Bay</span>;
      case 'completed':
        return <span className="badge badge-success" style={{ fontSize: 10 }}>Completed</span>;
      case 'delivered':
        return <span className="badge badge-success" style={{ fontSize: 10 }}>Delivered</span>;
      default:
        return <span className="badge badge-muted" style={{ fontSize: 10 }}>{status}</span>;
    }
  };

  if (loading) return (
    <div style={{ maxWidth: 540, margin: '0 auto' }} className="stagger">
      {[1,2,3].map(i => <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 8 }} />)}
    </div>
  );

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 56 }} className="animate-fade-in">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="t-h2">Jobs & Billing</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {activeInBay} active in bay · Receivables: {formatCurrency(totalReceivables)}
          </div>
        </div>
        <Link href="/work/new" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <IconPlus /> New Job
        </Link>
      </div>

      {/* ── Search & Filter ── */}
      <div className="search-bar mb-3">
        <IconSearch />
        <input
          placeholder="Search by job #, customer, reg #..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter pills */}
      <div className="pill-scroll mb-4" style={{ padding: '0 0 6px' }}>
        {[
          { id: 'all', label: 'All Jobs' },
          { id: 'active', label: 'In Bay' },
          { id: 'completed', label: 'Completed' },
          { id: 'delivered', label: 'Delivered' },
        ].map(tab => (
          <button
            key={tab.id}
            className="pill"
            style={filterStatus === tab.id ? {
              background: 'var(--brand-dim)',
              borderColor: 'var(--brand-border)',
              color: 'var(--text-brand)',
              fontWeight: 700,
            } : undefined}
            onClick={() => setFilterStatus(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Job Cards List ── */}
      {filteredJobs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><IconWrench /></div>
            <div className="empty-state-title">No service jobs found</div>
            <div className="empty-state-sub">Create a job card to track rig repairs, spare parts & billing.</div>
            <Link href="/work/new" className="btn btn-primary btn-sm" style={{ marginTop: 12, textDecoration: 'none' }}>
              <IconPlus /> Create Job Card
            </Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '4px 16px' }}>
          {filteredJobs.map(j => {
            const cust = getCustomer(j.customerId);
            const veh = getVehicle(j.vehicleId);
            return (
              <div key={j.id} className="list-row" style={{ padding: '12px 0' }}>
                <div className="list-avatar-sq" style={{ background: 'var(--info-dim)', color: 'var(--info)' }}>
                  <IconWrench />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Link
                      href={`/work/detail?id=${j.id}`}
                      style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}
                    >
                      {j.jobNo}
                    </Link>
                    {statusBadge(j.status)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {cust?.name || 'Walk-in'} {veh ? `· ${veh.regNo}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {j.complaint || 'General repair service'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(j.total)}
                  </div>
                  {j.balance > 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 700, marginTop: 1 }}>
                      Bal: {formatCurrency(j.balance)}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600, marginTop: 1 }}>
                      Paid
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
                    <button
                      onClick={e => handleDelete(j.id, j.jobNo, e)}
                      style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: 'transparent', border: 'none',
                        color: 'var(--text-muted)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title="Delete job"
                      aria-label="Delete job"
                    >
                      <IconTrash />
                    </button>
                    <Link href={`/work/detail?id=${j.id}`} style={{ color: 'var(--text-muted)', display: 'flex', textDecoration: 'none' }}>
                      <IconChevronRight />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
