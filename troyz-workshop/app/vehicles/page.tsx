'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllVehicles, saveVehicle, deleteVehicle, Vehicle, getAllCustomers, Customer } from '@/lib/db';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconTruck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
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

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [make, setMake] = useState('Ashok Leyland');
  const [model, setModel] = useState('PRD 1000');
  const [regNo, setRegNo] = useState('');
  const [rigType, setRigType] = useState('DTH Rig');
  const [compressor, setCompressor] = useState('ELGi 1100 CFM / 300 PSI');
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    Promise.all([getAllVehicles(), getAllCustomers()])
      .then(([v, c]) => {
        setVehicles(v);
        setCustomers(c);
        if (c.length > 0 && !customerId) {
          setCustomerId(c[0].id);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const h = () => loadData();
    window.addEventListener('troyz_data_updated', h);
    return () => window.removeEventListener('troyz_data_updated', h);
  }, []);

  const getCustomer = (id: string) => customers.find(c => c.id === id);

  const handleSave = async () => {
    if (!customerId || !regNo.trim()) return alert('Customer and Registration Number are required');
    setSaving(true);
    await saveVehicle({
      customerId,
      make,
      model,
      regNo: regNo.trim().toUpperCase(),
      rigType,
      compressorDetails: compressor,
    });
    setIsModalOpen(false);
    setRegNo('');
    setSaving(false);
    loadData();
  };

  const handleDelete = async (id: string, reg: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete bore rig "${reg}"? This cannot be undone.`)) {
      await deleteVehicle(id);
      loadData();
    }
  };

  if (loading) return (
    <div style={{ maxWidth: 540, margin: '0 auto' }} className="stagger">
      {[1,2,3].map(i => <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 8 }} />)}
    </div>
  );

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 56 }} className="animate-fade-in">
      
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="t-h2">Bore Rigs & Vehicles</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {vehicles.length} rigs registered across {customers.length} clients
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
          <IconPlus /> Add Rig
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><IconTruck /></div>
            <div className="empty-state-title">No bore rigs added</div>
            <div className="empty-state-sub">Add drilling rigs, compressors and trucks linked to your customers.</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setIsModalOpen(true)}>
              <IconPlus /> Add Bore Rig
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '4px 16px' }}>
          {vehicles.map(v => {
            const cust = getCustomer(v.customerId);
            return (
              <div key={v.id} className="list-row">
                <div className="list-avatar-sq" style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                  <IconTruck />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                      {v.regNo}
                    </span>
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>
                      {v.rigType || 'DTH Rig'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                    {cust && (
                      <Link
                        href={`/customers/profile?id=${cust.id}`}
                        style={{ fontSize: 12, color: 'var(--text-brand)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        👤 {cust.name}
                      </Link>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {v.make} {v.model}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={e => handleDelete(v.id, v.regNo, e)}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Delete rig"
                    aria-label="Delete rig"
                  >
                    <IconTrash />
                  </button>
                  {cust && (
                    <Link
                      href={`/customers/profile?id=${cust.id}`}
                      style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                      aria-label="View dossier"
                    >
                      <IconChevronRight />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Vehicle Sheet ── */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">New Bore Rig / Vehicle</div>
            <div className="modal-body">
              <div className="input-wrap">
                <label className="input-label">Customer / Owner *</label>
                <select className="input" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                </select>
              </div>

              <div className="input-wrap">
                <label className="input-label">Vehicle Registration No. *</label>
                <input
                  className="input"
                  style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  placeholder="e.g. TN 28 AB 1234"
                  value={regNo}
                  onChange={e => setRegNo(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="input-wrap">
                  <label className="input-label">Rig Type</label>
                  <select className="input" value={rigType} onChange={e => setRigType(e.target.value)}>
                    <option value="DTH Rig">DTH Rig</option>
                    <option value="Rotary Rig">Rotary Rig</option>
                    <option value="Direct Rotary">Direct Rotary</option>
                    <option value="Support Truck">Support Truck</option>
                    <option value="Compressor Truck">Compressor Truck</option>
                  </select>
                </div>
                <div className="input-wrap">
                  <label className="input-label">Truck Make</label>
                  <input className="input" value={make} onChange={e => setMake(e.target.value)} placeholder="Ashok Leyland / Tata" />
                </div>
              </div>

              <div className="input-wrap">
                <label className="input-label">Rig Unit / Model</label>
                <input className="input" value={model} onChange={e => setModel(e.target.value)} placeholder="PRD 1000 / KLR / Speedcraft" />
              </div>

              <div className="input-wrap">
                <label className="input-label">Compressor Details</label>
                <input className="input" value={compressor} onChange={e => setCompressor(e.target.value)} placeholder="ELGi 1100 CFM / 300 PSI" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button
                  className="btn btn-primary btn-full"
                  onClick={handleSave}
                  disabled={saving || !customerId || !regNo.trim()}
                >
                  {saving ? 'Saving...' : 'Save Bore Rig'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
