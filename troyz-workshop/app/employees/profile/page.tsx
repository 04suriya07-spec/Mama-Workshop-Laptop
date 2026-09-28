'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getWorker, getMonthAttendance, getAdvances, saveAdvance, deleteWorker, deleteAdvance, Worker, Attendance, Advance } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/currency';

const IconBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

function EmployeeProfileContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const router = useRouter();
  
  const [worker, setWorker] = useState<Worker | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceType, setAdvanceType] = useState<'advance' | 'bonus'>('advance');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNote, setAdvanceNote] = useState('');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);

  const [activeTab, setActiveTab] = useState<'attendance' | 'advances'>('attendance');

  const loadData = async () => {
    const w = await getWorker(id);
    if (!w) {
      router.push('/employees');
      return;
    }
    setWorker(w);
    
    const att = await getMonthAttendance(id, selectedYear, selectedMonth);
    setAttendances(att.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    const adv = await getAdvances(id);
    const monthAdv = adv.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setAdvances(monthAdv);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => { loadData(); };
    window.addEventListener('troyz_data_updated', handleUpdate);
    return () => window.removeEventListener('troyz_data_updated', handleUpdate);
  }, [id, selectedMonth, selectedYear]);

  const handleDeleteWorker = async () => {
    if (!worker) return;
    if (confirm(`Delete employee "${worker.name}"? This cannot be undone.`)) {
      await deleteWorker(id);
      router.push('/employees');
    }
  };

  const handleDeleteAdvance = async (advId: string, amount: number) => {
    if (confirm(`Delete this payment of ${formatCurrency(amount)}?`)) {
      await deleteAdvance(advId);
      loadData();
    }
  };

  const handleSaveAdvance = async () => {
    const amt = parseFloat(advanceAmount);
    if (!amt || amt <= 0) return alert('Enter a valid amount');
    
    await saveAdvance({
      workerId: id,
      type: advanceType,
      amount: amt,
      date: new Date(advanceDate).toISOString(),
      note: advanceNote
    });
    
    setIsAdvanceModalOpen(false);
    setAdvanceAmount(''); setAdvanceNote('');
    loadData();
  };

  if (loading || !worker) return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 96 }} className="stagger">
      {[1, 2, 3].map(i => <div key={i} className="skeleton skeleton-card" style={{ marginBottom: 12 }} />)}
    </div>
  );

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const daysPresent = attendances.filter(a => a.status === 'present').length + (attendances.filter(a => a.status === 'half_day').length * 0.5);
  const daysAbsent = attendances.filter(a => a.status === 'absent').length;
  
  const monthAdvances = advances.filter(a => a.type === 'advance').reduce((sum, a) => sum + a.amount, 0);
  const monthBonuses = advances.filter(a => a.type === 'bonus').reduce((sum, a) => sum + a.amount, 0);

  const earnedSalary = (worker.salary / daysInMonth) * daysPresent;
  const netPayable = earnedSalary - monthAdvances + monthBonuses;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }} className="animate-fade-in">
      
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => router.push('/employees')}
          className="btn btn-ghost btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 13 }}
        >
          <IconBack /> Team
        </button>
        <button
          onClick={handleDeleteWorker}
          style={{
            background: 'rgba(255, 69, 58, 0.12)', border: '1px solid rgba(255, 69, 58, 0.3)',
            color: '#FF453A', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
          }}
        >
          <IconTrash /> Delete
        </button>
      </div>

      {/* Hero card */}
      <div className="hero-card mb-4" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(135deg, #0A84FF 0%, #0060DF 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 900, color: '#FFF', flexShrink: 0,
            boxShadow: '0 4px 16px rgba(10, 132, 255, 0.35)',
          }}>
            {worker.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="t-h1" style={{ fontSize: 20, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {worker.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-brand" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                {worker.role.replace('_', ' ')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Base: {formatCurrency(worker.salary)}/mo
              </span>
            </div>
          </div>
        </div>

        {/* Month selector */}
        <div style={{ display: 'flex', gap: 8, background: 'rgba(255, 255, 255, 0.05)', padding: '6px 10px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <select
            className="input"
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
            style={{ flex: 2, height: 38, fontSize: 13, background: 'transparent', border: 'none', padding: '0 6px' }}
          >
            {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            className="input"
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            style={{ flex: 1, height: 38, fontSize: 13, background: 'transparent', border: 'none', padding: '0 6px' }}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Salary Overview Card */}
      <div
        className="card mb-3"
        style={{
          padding: '16px 18px',
          border: '1.5px solid rgba(255, 149, 0, 0.4)',
          background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.14) 0%, rgba(18, 20, 30, 0.95) 100%)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#FFA033' }}>
              Estimated Net Payable ({monthNames[selectedMonth]})
            </div>
            <div className="t-num-xl font-mono" style={{ color: '#FFA033', marginTop: 2 }}>
              {formatCurrency(Math.max(0, netPayable))}
            </div>
          </div>
          <span className="badge badge-brand" style={{ fontSize: 11, padding: '4px 10px' }}>
            {daysPresent} / {daysInMonth} Days
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Earned</div>
            <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: '#FFF' }}>{formatCurrency(earnedSalary)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Advance (-)</div>
            <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: '#FF453A' }}>{formatCurrency(monthAdvances)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Bonus (+)</div>
            <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: '#30D158' }}>{formatCurrency(monthBonuses)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="pill-scroll mb-3">
        <button
          className="pill"
          style={activeTab === 'attendance' ? { background: 'var(--brand-dim)', borderColor: 'var(--brand-border)', color: 'var(--text-brand)', fontWeight: 700 } : undefined}
          onClick={() => setActiveTab('attendance')}
        >
          Attendance ({attendances.length})
        </button>
        <button
          className="pill"
          style={activeTab === 'advances' ? { background: 'var(--brand-dim)', borderColor: 'var(--brand-border)', color: 'var(--text-brand)', fontWeight: 700 } : undefined}
          onClick={() => setActiveTab('advances')}
        >
          Advances & Bonus ({advances.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'attendance' && (
        <div className="card" style={{ padding: '4px 16px' }}>
          {attendances.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><IconCalendar /></div>
              <div className="empty-state-title">No attendance records</div>
              <div className="empty-state-sub">Mark daily punch on the main team attendance screen.</div>
            </div>
          ) : (
            attendances.map(a => (
              <div key={a.id} className="list-row" style={{ padding: '12px 0' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatDate(a.date)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Recorded shift log
                  </div>
                </div>
                <span
                  className="badge"
                  style={{
                    background: a.status === 'present' ? 'rgba(48, 209, 88, 0.15)' : a.status === 'half_day' ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                    color: a.status === 'present' ? '#30D158' : a.status === 'half_day' ? '#FFA033' : '#FF453A',
                    fontWeight: 800, fontSize: 11, padding: '3px 8px', textTransform: 'uppercase'
                  }}
                >
                  {a.status.replace('_', ' ')}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'advances' && (
        <div>
          <div className="flex justify-end mb-2">
            <button className="btn btn-primary btn-sm" onClick={() => setIsAdvanceModalOpen(true)}>
              <IconPlus /> Add Entry
            </button>
          </div>

          <div className="card" style={{ padding: '4px 16px' }}>
            {advances.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><IconPlus /></div>
                <div className="empty-state-title">No advances or bonus</div>
                <div className="empty-state-sub">Record salary advances or festival bonus payouts.</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => setIsAdvanceModalOpen(true)}>
                  + Add Entry
                </button>
              </div>
            ) : (
              advances.map(a => (
                <div key={a.id} className="list-row" style={{ padding: '12px 0' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`badge ${a.type === 'bonus' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10, textTransform: 'uppercase' }}>
                        {a.type}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatDate(a.date)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {a.note || 'Salary adjustment'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="font-mono" style={{ fontSize: 14, fontWeight: 800, color: a.type === 'bonus' ? '#30D158' : '#FF453A' }}>
                      {a.type === 'bonus' ? '+' : '-'}{formatCurrency(a.amount)}
                    </div>
                    <button
                      onClick={() => handleDeleteAdvance(a.id, a.amount)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', marginTop: 4 }}
                      title="Delete"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {isAdvanceModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAdvanceModalOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Record Advance or Bonus</div>
            <div className="modal-body">
              <div className="input-wrap">
                <label className="input-label">Type</label>
                <select className="input" value={advanceType} onChange={e => setAdvanceType(e.target.value as any)}>
                  <option value="advance">Advance (Deduction)</option>
                  <option value="bonus">Bonus / Incentive (Addition)</option>
                </select>
              </div>

              <div className="input-wrap">
                <label className="input-label">Amount (₹) *</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 3000"
                  value={advanceAmount}
                  onChange={e => setAdvanceAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="input-wrap">
                <label className="input-label">Date</label>
                <input
                  className="input"
                  type="date"
                  value={advanceDate}
                  onChange={e => setAdvanceDate(e.target.value)}
                />
              </div>

              <div className="input-wrap">
                <label className="input-label">Reason / Note</label>
                <input
                  className="input"
                  placeholder="e.g. Festival advance / emergency"
                  value={advanceNote}
                  onChange={e => setAdvanceNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setIsAdvanceModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={handleSaveAdvance}>Save Entry</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function EmployeeProfilePage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 540, margin: '0 auto' }} className="loader" />}>
      <EmployeeProfileContent />
    </Suspense>
  );
}
