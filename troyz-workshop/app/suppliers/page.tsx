'use client';

import { useEffect, useState } from 'react';
import { getAllSuppliers, saveSupplier, deleteSupplier, Supplier } from '@/lib/db';
import { formatCurrency } from '@/lib/currency';

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

const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.00 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.07 6.07l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    getAllSuppliers().then(setSuppliers).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const h = () => loadData();
    window.addEventListener('troyz_data_updated', h);
    return () => window.removeEventListener('troyz_data_updated', h);
  }, []);

  const handleDelete = async (id: string, supplierName: string) => {
    if (confirm(`Delete supplier "${supplierName}"? This cannot be undone.`)) {
      await deleteSupplier(id);
      loadData();
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return alert('Supplier name is required');
    setSaving(true);
    await saveSupplier({ name: name.trim(), phone, address, totalPurchased: 0, totalPaid: 0, balance: 0 });
    setIsModalOpen(false);
    setName(''); setPhone(''); setAddress('');
    setSaving(false);
    loadData();
  };

  if (loading) return (
    <div style={{ maxWidth: 540, margin: '0 auto' }} className="stagger">
      {[1,2,3].map(i => <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 8 }} />)}
    </div>
  );

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 56 }} className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="t-h2">Suppliers</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {suppliers.length} vendor{suppliers.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
          <IconPlus /> Add
        </button>
      </div>

      {suppliers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><IconTruck /></div>
            <div className="empty-state-title">No suppliers yet</div>
            <div className="empty-state-sub">Add vendors you purchase parts and materials from.</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setIsModalOpen(true)}>
              <IconPlus /> Add Supplier
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '4px 16px' }}>
          {suppliers.map((s, idx) => (
            <div key={s.id} className="list-row">
              <div className="list-avatar-sq" style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                <IconTruck />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                  {s.phone && (
                    <a href={`tel:${s.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--text-muted)', textDecoration: 'none' }}>
                      <IconPhone />{s.phone}
                    </a>
                  )}
                  {(s.balance ?? 0) > 0 && (
                    <span className="badge badge-danger" style={{ fontSize: 10 }}>
                      Owed: {formatCurrency(s.balance ?? 0)}
                    </span>
                  )}
                  {(s.totalPurchased ?? 0) > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Purchased: {formatCurrency(s.totalPurchased ?? 0)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(s.id, s.name)}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title="Delete supplier"
                aria-label="Delete supplier"
              >
                <IconTrash />
              </button>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">New Supplier</div>
            <div className="modal-body">
              <div className="input-wrap">
                <label className="input-label">Supplier Name *</label>
                <input className="input" placeholder="e.g. Kumar Spares" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </div>
              <div className="input-wrap">
                <label className="input-label">Phone</label>
                <input className="input" type="tel" placeholder="Contact number" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="input-wrap">
                <label className="input-label">Address</label>
                <input className="input" placeholder="City / Area" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving || !name.trim()}>
                  {saving ? 'Saving...' : 'Add Supplier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
