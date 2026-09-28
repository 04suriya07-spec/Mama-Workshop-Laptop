'use client';

import { useEffect, useState } from 'react';
import { getAllParts, savePart, deletePart, Part, getAllSuppliers, Supplier } from '@/lib/db';
import { formatCurrency } from '@/lib/currency';

const IconBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
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

const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default function StockPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('5');
  const [unit, setUnit] = useState('Piece');
  const [supplierId, setSupplierId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    Promise.all([getAllParts(), getAllSuppliers()])
      .then(([p, s]) => { setParts(p); setSuppliers(s); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const h = () => loadData();
    window.addEventListener('troyz_data_updated', h);
    return () => window.removeEventListener('troyz_data_updated', h);
  }, []);

  const handleDelete = async (id: string, partName: string) => {
    if (confirm(`Delete "${partName}" from inventory?`)) {
      await deletePart(id);
      loadData();
    }
  };

  const handleSave = async () => {
    if (!name || !purchasePrice || !sellingPrice) return alert('Name and pricing are required');
    setSaving(true);
    await savePart({
      sku: sku || `SKU-${Date.now().toString().slice(-4)}`,
      name,
      purchasePrice: parseFloat(purchasePrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      stock: parseInt(stock) || 0,
      minStock: parseInt(minStock) || 5,
      unit,
      supplierId: supplierId || undefined,
    });
    setIsModalOpen(false);
    setSku(''); setName(''); setPurchasePrice(''); setSellingPrice(''); setStock('0');
    setSaving(false);
    loadData();
  };

  const lowStockCount = parts.filter(p => p.stock <= p.minStock).length;

  if (loading) return (
    <div style={{ maxWidth: 540, margin: '0 auto' }} className="stagger">
      {[1,2,3].map(i => <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 8 }} />)}
    </div>
  );

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 56 }} className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="t-h2">Stock</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {parts.length} items
            {lowStockCount > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--warning)', fontWeight: 700 }}>
                · {lowStockCount} low stock
              </span>
            )}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
          <IconPlus /> Add Part
        </button>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: 'var(--warning-dim)', border: '1px solid var(--warning-bdr)',
          borderRadius: 'var(--r-lg)', marginBottom: 16, fontSize: 13, color: 'var(--warning)', fontWeight: 600,
        }}>
          <IconAlert />
          {lowStockCount} item{lowStockCount > 1 ? 's' : ''} below minimum stock level — reorder soon
        </div>
      )}

      {parts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><IconBox /></div>
            <div className="empty-state-title">No inventory added</div>
            <div className="empty-state-sub">Track spare parts, supplies and materials for your workshop.</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setIsModalOpen(true)}>
              <IconPlus /> Add First Item
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '4px 16px' }}>
          {parts.map(p => {
            const isLow = p.stock <= p.minStock;
            return (
              <div key={p.id} className="list-row">
                <div
                  className="list-avatar-sq"
                  style={{
                    background: isLow ? 'var(--warning-dim)' : 'var(--info-dim)',
                    color: isLow ? 'var(--warning)' : 'var(--info)',
                  }}
                >
                  <IconBox />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                    <span
                      className={`badge ${isLow ? 'badge-warning' : 'badge-success'}`}
                      style={{ fontSize: 10, padding: '2px 7px' }}
                    >
                      {isLow && <IconAlert />}
                      {p.stock} {p.unit}s
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      Sell: {formatCurrency(p.sellingPrice)}
                    </span>
                    {p.sku && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {p.sku}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(p.sellingPrice)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                      Cost: {formatCurrency(p.purchasePrice)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Delete"
                    aria-label="Delete part"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Add New Part</div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-wrap" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Part Name *</label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="e.g. DTH Bit 4.5 inch" />
                </div>
                <div className="input-wrap">
                  <label className="input-label">SKU</label>
                  <input className="input" placeholder="Auto if blank" value={sku} onChange={e => setSku(e.target.value)} />
                </div>
                <div className="input-wrap">
                  <label className="input-label">Unit</label>
                  <select className="input" value={unit} onChange={e => setUnit(e.target.value)}>
                    <option value="Piece">Piece</option>
                    <option value="Litre">Litre</option>
                    <option value="Set">Set</option>
                    <option value="Meter">Meter</option>
                  </select>
                </div>
                <div className="input-wrap">
                  <label className="input-label">Purchase Price (₹) *</label>
                  <input className="input" type="number" inputMode="decimal" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} />
                </div>
                <div className="input-wrap">
                  <label className="input-label">Selling Price (₹) *</label>
                  <input className="input" type="number" inputMode="decimal" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} />
                </div>
                <div className="input-wrap">
                  <label className="input-label">Stock Qty</label>
                  <input className="input" type="number" value={stock} onChange={e => setStock(e.target.value)} />
                </div>
                <div className="input-wrap">
                  <label className="input-label">Min. Alert Level</label>
                  <input className="input" type="number" value={minStock} onChange={e => setMinStock(e.target.value)} />
                </div>
                <div className="input-wrap" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Supplier (optional)</label>
                  <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                    <option value="">-- None --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving || !name}>
                  {saving ? 'Saving...' : 'Save Part'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
