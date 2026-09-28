'use client';

import { useEffect, useState } from 'react';
import { getAllWorkers, saveWorker, markAttendance, saveAdvance, deleteWorker, getAttendance, Worker } from '@/lib/db';
import { formatCurrency } from '@/lib/currency';
import Link from 'next/link';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconWorker = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
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

const IconMoney = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
);

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─── Role helpers ─────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  mechanic: 'Mechanic', lathe_operator: 'Lathe Op.', welder: 'Welder',
  helper: 'Helper', driver: 'Driver', manager: 'Manager',
};

const AVATAR_COLORS = [
  { bg: 'rgba(249,115,22,0.12)', color: '#FB923C' },
  { bg: 'rgba(129,140,248,0.12)', color: '#A5B4FC' },
  { bg: 'rgba(34,197,94,0.12)', color: '#4ADE80' },
  { bg: 'rgba(251,191,36,0.12)', color: '#FDE047' },
  { bg: 'rgba(239,68,68,0.12)', color: '#F87171' },
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

type AttStatus = 'present' | 'absent' | 'half_day';

export default function EmployeesPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<'directory' | 'attendance'>('directory');
  const [filterRole, setFilterRole] = useState('all');

  // Quick Advance Modal
  const [advanceWorker, setAdvanceWorker] = useState<Worker | null>(null);
  const [quickAdvAmount, setQuickAdvAmount] = useState('1000');
  const [quickAdvNote, setQuickAdvNote] = useState('');

  // New Employee Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('mechanic');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [saving, setSaving] = useState(false);

  // Attendance
  const [todayStr] = useState(new Date().toISOString().split('T')[0]);
  const [bulkAttDate, setBulkAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkAttData, setBulkAttData] = useState<Record<string, AttStatus>>({});
  const [attSavedMessage, setAttSavedMessage] = useState('');

  const loadData = async () => {
    try {
      const ws = await getAllWorkers();
      setWorkers(ws);
      const attState: Record<string, AttStatus> = {};
      const dateKey = (bulkAttDate || todayStr).split('T')[0];
      for (const w of ws.filter(w => w.isActive)) {
        const recs = await getAttendance(w.id);
        const rec = recs.find(a => (a.date || '').split('T')[0] === dateKey);
        attState[w.id] = rec ? (rec.status as AttStatus) : 'present';
      }
      setBulkAttData(attState);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const h = () => loadData();
    window.addEventListener('troyz_data_updated', h);
    return () => window.removeEventListener('troyz_data_updated', h);
  }, [bulkAttDate]);

  const handleDeleteWorker = async (id: string, workerName: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (confirm(`Delete employee "${workerName}"?`)) {
      await deleteWorker(id);
      loadData();
    }
  };

  const handleMarkAllPresent = () => {
    const newState: Record<string, AttStatus> = {};
    workers.filter(w => w.isActive).forEach(w => { newState[w.id] = 'present'; });
    setBulkAttData(newState);
  };

  const handleSaveAttendance = async () => {
    const active = workers.filter(w => w.isActive);
    for (const w of active) {
      await markAttendance({
        workerId: w.id,
        date: new Date(bulkAttDate).toISOString(),
        status: bulkAttData[w.id] || 'present',
      });
    }
    setAttSavedMessage(`Saved attendance for ${active.length} employees`);
    setTimeout(() => setAttSavedMessage(''), 4000);
  };

  const handleSaveAdvance = async () => {
    if (!advanceWorker) return;
    const amt = parseFloat(quickAdvAmount);
    if (!amt || amt <= 0) return alert('Enter valid advance amount');
    await saveAdvance({
      workerId: advanceWorker.id,
      amount: amt,
      type: 'advance',
      note: quickAdvNote || 'Quick Mobile Advance',
      date: todayStr,
    });
    setAdvanceWorker(null);
    setQuickAdvAmount('1000');
    setQuickAdvNote('');
  };

  const handleSave = async () => {
    if (!name || !salary) return alert('Name and salary are required');
    setSaving(true);
    await saveWorker({
      name, role: role as any, phone,
      salary: parseFloat(salary) || 0,
      joinDate: new Date().toISOString(),
      isActive: true,
    });
    setIsModalOpen(false);
    setName(''); setPhone(''); setSalary(''); setRole('mechanic');
    setSaving(false);
    loadData();
  };

  if (loading) return (
    <div style={{ maxWidth: 540, margin: '0 auto' }} className="stagger">
      {[1,2,3].map(i => <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 8 }} />)}
    </div>
  );

  const activeWorkers = workers.filter(w => w.isActive);
  const totalPayroll = activeWorkers.reduce((s, w) => s + w.salary, 0);
  const presentToday = Object.values(bulkAttData).filter(s => s === 'present').length;

  const filteredWorkers = filterRole === 'all' ? workers : workers.filter(w => w.role === filterRole);

  const attColors: Record<AttStatus, { label: string; cls: string; color: string; bg: string }> = {
    present:  { label: 'Present', cls: 'badge-success', color: 'var(--success)', bg: 'var(--success-dim)' },
    absent:   { label: 'Absent',  cls: 'badge-danger',  color: 'var(--danger)',  bg: 'var(--danger-dim)' },
    half_day: { label: 'Half Day', cls: 'badge-warning', color: 'var(--warning)', bg: 'var(--warning-dim)' },
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 56 }} className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="t-h2">Employees</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {activeWorkers.length} active · Payroll: {formatCurrency(totalPayroll)}/mo
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
          <IconPlus /> Add
        </button>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div className="kpi-tile">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{activeWorkers.length}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Present</div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{presentToday}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Payroll</div>
          <div className="kpi-value" style={{ fontSize: 14 }}>{formatCurrency(totalPayroll)}</div>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="tabs mb-4">
        <button className={`tab-btn ${mainTab === 'directory' ? 'active' : ''}`} onClick={() => setMainTab('directory')}>
          Staff Directory
        </button>
        <button className={`tab-btn ${mainTab === 'attendance' ? 'active' : ''}`} onClick={() => setMainTab('attendance')}>
          Attendance
        </button>
      </div>

      {/* ═══════════════ DIRECTORY VIEW ═══════════════ */}
      {mainTab === 'directory' && (
        <>
          {/* Role filter pills */}
          <div className="pill-scroll mb-4" style={{ padding: '0 0 8px' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'mechanic', label: 'Mechanic' },
              { id: 'lathe_operator', label: 'Lathe' },
              { id: 'welder', label: 'Welder' },
              { id: 'helper', label: 'Helper' },
              { id: 'driver', label: 'Driver' },
            ].map(f => (
              <button
                key={f.id}
                className="pill"
                style={filterRole === f.id ? {
                  background: 'var(--brand-dim)',
                  borderColor: 'var(--brand-border)',
                  color: 'var(--text-brand)',
                } : undefined}
                onClick={() => setFilterRole(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredWorkers.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon"><IconWorker /></div>
                <div className="empty-state-title">No employees found</div>
                <div className="empty-state-sub">Add your first team member or use voice: "Pudhu aal Murugan mechanic"</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setIsModalOpen(true)}>
                  <IconPlus /> Add Employee
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '4px 16px' }}>
              {filteredWorkers.map(w => {
                const av = getAvatarColor(w.name);
                return (
                  <div key={w.id} className="list-row">
                    <div className="list-avatar" style={{ background: av.bg, color: av.color, fontSize: 15, fontWeight: 800 }}>
                      {w.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{w.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                        <span className="badge badge-muted" style={{ fontSize: 10 }}>
                          {ROLE_LABELS[w.role] ?? w.role}
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(w.salary)}/mo
                        </span>
                        {!w.isActive && (
                          <span className="badge badge-danger" style={{ fontSize: 10 }}>Inactive</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => { setAdvanceWorker(w); setQuickAdvAmount('1000'); setQuickAdvNote(''); }}
                        style={{
                          width: 30, height: 30, borderRadius: 8,
                          background: 'var(--success-dim)', border: '1px solid var(--success-bdr)',
                          color: 'var(--success)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        title="Give Advance"
                        aria-label="Give advance"
                      >
                        <IconMoney />
                      </button>
                      <Link
                        href={`/employees/profile?id=${w.id}`}
                        style={{
                          width: 30, height: 30, borderRadius: 8,
                          background: 'var(--info-dim)', border: '1px solid var(--info-bdr)',
                          color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          textDecoration: 'none',
                        }}
                        title="View Ledger"
                        aria-label="View employee ledger"
                      >
                        <IconCalendar />
                      </Link>
                      <button
                        onClick={e => handleDeleteWorker(w.id, w.name, e)}
                        style={{
                          width: 30, height: 30, borderRadius: 8,
                          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                          color: 'var(--text-muted)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        title="Delete"
                        aria-label="Delete employee"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════════ ATTENDANCE VIEW ═══════════════ */}
      {mainTab === 'attendance' && (
        <>
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Select Date</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  Mark attendance for your team
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleMarkAllPresent}
                style={{ fontSize: 12 }}
              >
                Mark All Present
              </button>
            </div>

            <input
              type="date"
              className="input input-sm mb-4"
              value={bulkAttDate}
              onChange={e => setBulkAttDate(e.target.value)}
              max={todayStr}
            />

            {activeWorkers.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <div className="empty-state-title" style={{ fontSize: 14 }}>No active employees</div>
                <div className="empty-state-sub">Add employees first from the Staff Directory tab.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeWorkers.map(w => {
                  const status = bulkAttData[w.id] || 'present';
                  const av = getAvatarColor(w.name);
                  return (
                    <div
                      key={w.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--r-md)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: av.bg, color: av.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 800, flexShrink: 0,
                        }}
                      >
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{w.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                          {ROLE_LABELS[w.role] ?? w.role}
                        </div>
                      </div>
                      {/* Toggle buttons */}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {(['present', 'half_day', 'absent'] as AttStatus[]).map(s => (
                          <button
                            key={s}
                            onClick={() => setBulkAttData(prev => ({ ...prev, [w.id]: s }))}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: `1px solid ${status === s ? attColors[s].color : 'var(--border)'}`,
                              background: status === s ? attColors[s].bg : 'transparent',
                              color: status === s ? attColors[s].color : 'var(--text-muted)',
                              fontSize: 10, fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {s === 'present' ? 'P' : s === 'half_day' ? 'H' : 'A'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeWorkers.length > 0 && (
              <div style={{ marginTop: 16 }}>
                {attSavedMessage && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 8, marginBottom: 10,
                    background: 'var(--success-dim)', border: '1px solid var(--success-bdr)',
                    color: 'var(--success)', fontSize: 12.5, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <IconCheck /> {attSavedMessage}
                  </div>
                )}
                <button className="btn btn-primary btn-full" onClick={handleSaveAttendance}>
                  Save Attendance
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── New Employee Sheet ── */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">New Employee</div>
            <div className="modal-body">
              <div className="input-wrap">
                <label className="input-label">Full Name *</label>
                <input className="input" placeholder="e.g. Murugan K" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </div>
              <div className="input-wrap">
                <label className="input-label">Role *</label>
                <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="mechanic">Mechanic</option>
                  <option value="lathe_operator">Lathe Operator</option>
                  <option value="welder">Welder</option>
                  <option value="helper">Helper</option>
                  <option value="driver">Driver</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div className="input-wrap">
                <label className="input-label">Monthly Salary (₹) *</label>
                <input className="input" type="number" inputMode="decimal" placeholder="e.g. 15000" value={salary} onChange={e => setSalary(e.target.value)} />
              </div>
              <div className="input-wrap">
                <label className="input-label">Phone</label>
                <input className="input" type="tel" placeholder="Contact number" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving || !name || !salary}>
                  {saving ? 'Saving...' : 'Add Employee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Advance Sheet ── */}
      {advanceWorker && (
        <div className="modal-backdrop" onClick={() => setAdvanceWorker(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Give Advance — {advanceWorker.name}</div>
            <div className="modal-body">
              <div className="input-wrap">
                <label className="input-label">Amount (₹) *</label>
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  value={quickAdvAmount}
                  onChange={e => setQuickAdvAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="input-wrap">
                <label className="input-label">Note</label>
                <input
                  className="input"
                  placeholder="Reason (optional)"
                  value={quickAdvNote}
                  onChange={e => setQuickAdvNote(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setAdvanceWorker(null)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={handleSaveAdvance}>
                  Give Advance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
