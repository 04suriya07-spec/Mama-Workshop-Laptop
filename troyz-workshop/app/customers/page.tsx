'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllCustomers, getAllVehicles, saveCustomer, deleteCustomer, Customer, Vehicle } from '@/lib/db';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.00 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.07 6.07l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── Avatar letter helper ─────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: 'rgba(249,115,22,0.12)', color: '#FB923C' },
  { bg: 'rgba(129,140,248,0.12)', color: '#A5B4FC' },
  { bg: 'rgba(34,197,94,0.12)',  color: '#4ADE80' },
  { bg: 'rgba(251,191,36,0.12)', color: '#FDE047' },
  { bg: 'rgba(239,68,68,0.12)',  color: '#F87171' },
];

function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    Promise.all([getAllCustomers(), getAllVehicles()]).then(([c, v]) => {
      setCustomers(c);
      setVehicles(v);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('troyz_data_updated', handler);
    return () => window.removeEventListener('troyz_data_updated', handler);
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) return alert('Name and Phone are required.');
    setSaving(true);
    await saveCustomer({ name: name.trim(), phone, address, whatsapp });
    setIsModalOpen(false);
    setName(''); setPhone(''); setAddress(''); setWhatsapp('');
    setSaving(false);
    loadData();
  };

  const handleDelete = async (id: string, custName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete customer "${custName}"? This cannot be undone.`)) {
      await deleteCustomer(id);
      loadData();
    }
  };

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  if (loading) {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto' }} className="stagger">
        {[1,2,3,4].map(i => (
          <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 56 }} className="animate-fade-in">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="t-h2">Customers</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {customers.length} {customers.length === 1 ? 'client' : 'clients'} · {vehicles.length} vehicles
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
          <IconPlus /> Add
        </button>
      </div>

      {/* ── Search ── */}
      <div className="search-bar mb-4">
        <IconSearch />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          aria-label="Search customers"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
          >
            <IconX />
          </button>
        )}
      </div>

      {/* ── Customer List ── */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><IconUsers /></div>
            <div className="empty-state-title">{search ? 'No matches found' : 'No customers yet'}</div>
            <div className="empty-state-sub">
              {search ? `Try a different name or number.` : 'Add your first customer or use the voice assistant.'}
            </div>
            {!search && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setIsModalOpen(true)}>
                <IconPlus /> Add Customer
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '4px 16px' }}>
          {filtered.map((c, idx) => {
            const custVehicles = vehicles.filter(v => v.customerId === c.id);
            const av = getAvatarColor(c.name);
            return (
              <div key={c.id} className="list-row" style={{ padding: '12px 0' }}>
                {/* Avatar */}
                <div
                  className="list-avatar"
                  style={{ background: av.bg, color: av.color, fontSize: 14, fontWeight: 800, flexShrink: 0 }}
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    href={`/customers/profile?id=${c.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      {c.name}
                    </div>
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                    <a
                      href={`tel:${c.phone}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
                    >
                      <IconPhone />
                      {c.phone}
                    </a>
                    {custVehicles.length > 0 && (
                      <span className="badge badge-brand" style={{ fontSize: 10, padding: '2px 7px' }}>
                        {custVehicles.length} {custVehicles.length === 1 ? 'rig' : 'rigs'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(c.id, c.name, e)}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Delete"
                    aria-label="Delete customer"
                  >
                    <IconTrash />
                  </button>
                  <Link
                    href={`/customers/profile?id=${c.id}`}
                    style={{
                      color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                      textDecoration: 'none',
                    }}
                    aria-label={`View ${c.name} profile`}
                  >
                    <IconChevronRight />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Customer Sheet ── */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">New Customer</div>
            <div className="modal-body">
              <div className="input-wrap">
                <label className="input-label">Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Balaji Borewells"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="input-wrap">
                <label className="input-label">Phone *</label>
                <input
                  className="input"
                  placeholder="e.g. 9845123456"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div className="input-wrap">
                <label className="input-label">WhatsApp (optional)</label>
                <input
                  className="input"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="Same as phone if blank"
                />
              </div>
              <div className="input-wrap">
                <label className="input-label">Address / Location</label>
                <input
                  className="input"
                  placeholder="e.g. Namakkal, Tamil Nadu"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button
                  className="btn btn-primary btn-full"
                  onClick={handleSave}
                  disabled={saving || !name.trim() || !phone.trim()}
                >
                  {saving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
