'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getSupplier, getPurchasesBySupplier, getAllParts, getAllExpenses,
  savePurchase, paySupplier, adjustStock, Supplier, Purchase, Part, Expense, PaymentMethod
} from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/currency';

interface PurchaseLineItem {
  partId?: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

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

const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.00 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.07 6.07l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const IconBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

function SupplierProfileContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const router = useRouter();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendorExpenses, setVendorExpenses] = useState<Expense[]>([]);
  const [partsList, setPartsList] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'purchases' | 'payments'>('purchases');

  // Purchase Modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [billNo, setBillNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseLineItem[]>([]);
  const [amountPaidNow, setAmountPaidNow] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('upi');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');

  const loadData = async () => {
    const s = await getSupplier(id);
    if (!s) {
      router.push('/suppliers');
      return;
    }
    setSupplier(s);

    const [allP, allParts, allExp] = await Promise.all([
      getPurchasesBySupplier(id),
      getAllParts(),
      getAllExpenses(),
    ]);

    setPurchases(allP.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setPartsList(allParts);
    
    const sExp = allExp.filter(e => e.supplierId === id || e.description.toLowerCase().includes(s.name.toLowerCase()));
    setVendorExpenses(sExp.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    setPayAmount(s.balance > 0 ? s.balance.toString() : '');
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAddCustomItem = () => {
    setPurchaseItems([
      ...purchaseItems,
      {
        name: 'Spare Part / Item',
        qty: 1,
        unitPrice: 500,
        total: 500,
      }
    ]);
  };

  const handleItemChange = (index: number, field: keyof PurchaseLineItem, val: any) => {
    const next = [...purchaseItems];
    next[index] = { ...next[index], [field]: val };
    if (field === 'qty' || field === 'unitPrice') {
      next[index].total = (next[index].qty || 0) * (next[index].unitPrice || 0);
    }
    setPurchaseItems(next);
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const purchaseGrandTotal = purchaseItems.reduce((sum, item) => sum + item.total, 0);

  const handleSavePurchase = async () => {
    if (purchaseItems.length === 0) return alert('Please add at least one part/item.');
    const paid = parseFloat(amountPaidNow) || 0;
    
    await savePurchase({
      supplierId: id,
      billNo: billNo || undefined,
      items: purchaseItems,
      subtotal: purchaseGrandTotal,
      total: purchaseGrandTotal,
      paid: paid,
      balance: Math.max(0, purchaseGrandTotal - paid),
      date: new Date(purchaseDate).toISOString(),
      notes: purchaseNotes,
    });

    for (const item of purchaseItems) {
      if (item.partId) {
        await adjustStock(item.partId, 'purchase', item.qty, `Purchase Bill ${billNo || ''}`);
      }
    }

    setIsPurchaseModalOpen(false);
    setPurchaseItems([]);
    setBillNo('');
    setAmountPaidNow('');
    setPurchaseNotes('');
    loadData();
  };

  const handleSavePayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return alert('Enter a valid payment amount');

    await paySupplier({
      supplierId: id,
      amount: amt,
      method: payMethod,
      note: payNote,
      date: payDate,
    });

    setIsPayModalOpen(false);
    setPayAmount('');
    setPayNote('');
    loadData();
  };

  if (loading || !supplier) return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 96 }} className="stagger">
      {[1, 2, 3].map(i => <div key={i} className="skeleton skeleton-card" style={{ marginBottom: 12 }} />)}
    </div>
  );

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }} className="animate-fade-in">
      
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => router.push('/suppliers')}
          className="btn btn-ghost btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 13 }}
        >
          <IconBack /> Suppliers
        </button>
      </div>

      {/* Hero card */}
      <div className="hero-card mb-4" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(135deg, #AF52DE 0%, #5856D6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 900, color: '#FFF', flexShrink: 0,
            boxShadow: '0 4px 16px rgba(175, 82, 222, 0.35)',
          }}>
            {supplier.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="t-h1" style={{ fontSize: 20, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {supplier.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {supplier.phone && (
                <a
                  href={`tel:${supplier.phone}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600 }}
                >
                  <IconPhone /> {supplier.phone}
                </a>
              )}
              {supplier.address && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {supplier.address}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2 Primary Glass Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {supplier.balance > 0 && (
            <button
              type="button"
              onClick={() => setIsPayModalOpen(true)}
              style={{
                height: 44, borderRadius: 14,
                border: '1px solid rgba(48, 209, 88, 0.4)',
                background: 'linear-gradient(135deg, rgba(48, 209, 88, 0.22) 0%, rgba(48, 209, 88, 0.08) 100%)',
                color: '#30D158', fontWeight: 800, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
              }}
            >
              Pay Supplier
            </button>
          )}
          <button
            type="button"
            onClick={() => { setPurchaseItems([{ name: 'Spare Parts', qty: 1, unitPrice: 1000, total: 1000 }]); setIsPurchaseModalOpen(true); }}
            style={{
              height: 44, borderRadius: 14,
              border: '1px solid rgba(255, 149, 0, 0.4)',
              background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.22) 0%, rgba(255, 149, 0, 0.08) 100%)',
              color: '#FFA033', fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
              gridColumn: supplier.balance > 0 ? 'auto' : 'span 2',
            }}
          >
            <IconPlus /> Record Bill
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        <div className="kpi-tile kpi-tile-blue" style={{ padding: '10px 12px' }}>
          <div className="kpi-tile-label" style={{ fontSize: 10 }}>Total Purchases</div>
          <div className="kpi-tile-val font-mono" style={{ fontSize: 14, marginTop: 2 }}>{formatCurrency(supplier.totalPurchased)}</div>
        </div>

        <div className="kpi-tile kpi-tile-green" style={{ padding: '10px 12px' }}>
          <div className="kpi-tile-label" style={{ fontSize: 10 }}>Total Paid</div>
          <div className="kpi-tile-val font-mono" style={{ fontSize: 14, marginTop: 2 }}>{formatCurrency(supplier.totalPaid)}</div>
        </div>

        <div className={`kpi-tile ${supplier.balance > 0 ? 'kpi-tile-red' : 'kpi-tile-green'}`} style={{ padding: '10px 12px' }}>
          <div className="kpi-tile-label" style={{ fontSize: 10 }}>Pending Due</div>
          <div className="kpi-tile-val font-mono" style={{ fontSize: 14, marginTop: 2 }}>{formatCurrency(supplier.balance)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="pill-scroll mb-3">
        <button
          className="pill"
          style={activeTab === 'purchases' ? { background: 'var(--brand-dim)', borderColor: 'var(--brand-border)', color: 'var(--text-brand)', fontWeight: 700 } : undefined}
          onClick={() => setActiveTab('purchases')}
        >
          Purchase Bills ({purchases.length})
        </button>
        <button
          className="pill"
          style={activeTab === 'payments' ? { background: 'var(--brand-dim)', borderColor: 'var(--brand-border)', color: 'var(--text-brand)', fontWeight: 700 } : undefined}
          onClick={() => setActiveTab('payments')}
        >
          Payments Cleared ({vendorExpenses.length})
        </button>
      </div>

      {/* Tab 1: Purchases */}
      {activeTab === 'purchases' && (
        <div className="card" style={{ padding: '4px 16px' }}>
          {purchases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><IconBox /></div>
              <div className="empty-state-title">No purchase bills</div>
              <div className="empty-state-sub">Log parts inventory purchases from this vendor.</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => { setPurchaseItems([{ name: 'Spare Parts', qty: 1, unitPrice: 1000, total: 1000 }]); setIsPurchaseModalOpen(true); }}>
                + Record Bill
              </button>
            </div>
          ) : (
            purchases.map(p => (
              <div key={p.id} className="list-row" style={{ padding: '12px 0' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {p.purchaseNo}
                    </span>
                    {p.billNo && (
                      <span className="badge badge-muted" style={{ fontSize: 9, padding: '1px 5px' }}>
                        Bill #{p.billNo}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.items?.map(i => `${i.name} (x${i.qty})`).join(', ') || 'Parts'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatDate(p.date)}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="font-mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatCurrency(p.total)}
                  </div>
                  {p.balance > 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 700, marginTop: 2 }}>
                      Due: {formatCurrency(p.balance)}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600, marginTop: 2 }}>
                      Paid
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Payments */}
      {activeTab === 'payments' && (
        <div className="card" style={{ padding: '4px 16px' }}>
          {vendorExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><IconPlus /></div>
              <div className="empty-state-title">No payments recorded</div>
              <div className="empty-state-sub">Cleared vendor payouts will appear here.</div>
            </div>
          ) : (
            vendorExpenses.map(e => (
              <div key={e.id} className="list-row" style={{ padding: '12px 0' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {e.description}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatDate(e.date)} · <span style={{ textTransform: 'uppercase' }}>{e.method}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="font-mono" style={{ fontSize: 14, fontWeight: 800, color: '#30D158' }}>
                    {formatCurrency(e.amount)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Pay Supplier */}
      {isPayModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsPayModalOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Pay Supplier ({supplier.name})</div>
            <div className="modal-body">
              <div className="input-wrap">
                <label className="input-label">Amount (₹) *</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 10000"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="input-wrap">
                <label className="input-label">Payment Mode</label>
                <select className="input" value={payMethod} onChange={e => setPayMethod(e.target.value as any)}>
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div className="input-wrap">
                <label className="input-label">Date</label>
                <input className="input" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>

              <div className="input-wrap">
                <label className="input-label">Reference / Note</label>
                <input className="input" placeholder="e.g. Paid via GPay ref #1234" value={payNote} onChange={e => setPayNote(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setIsPayModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={handleSavePayment}>Save Payment</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Record Purchase */}
      {isPurchaseModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsPurchaseModalOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Record Purchase Bill</div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="input-wrap">
                  <label className="input-label">Vendor Bill #</label>
                  <input className="input" placeholder="e.g. 542" value={billNo} onChange={e => setBillNo(e.target.value)} />
                </div>
                <div className="input-wrap">
                  <label className="input-label">Date</label>
                  <input className="input" type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                </div>
              </div>

              {/* Items List */}
              <div style={{ marginTop: 6 }}>
                <div className="flex items-center justify-between mb-2">
                  <label className="input-label" style={{ margin: 0 }}>Items / Parts</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddCustomItem} style={{ fontSize: 11, padding: '2px 8px' }}>
                    + Add Item
                  </button>
                </div>

                {purchaseItems.map((item, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: 10, marginBottom: 8 }}>
                    <div className="flex items-center justify-between mb-2">
                      <input
                        className="input"
                        value={item.name}
                        onChange={e => handleItemChange(idx, 'name', e.target.value)}
                        placeholder="Part name"
                        style={{ height: 36, fontSize: 13, flex: 1, marginRight: 8 }}
                      />
                      <button type="button" onClick={() => handleRemoveItem(idx)} style={{ background: 'none', border: 'none', color: '#FF453A', cursor: 'pointer', padding: 4 }}>
                        ✕
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Qty</div>
                        <input
                          className="input"
                          type="number"
                          value={item.qty}
                          onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                          style={{ height: 34, fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Price (₹)</div>
                        <input
                          className="input"
                          type="number"
                          value={item.unitPrice}
                          onChange={e => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          style={{ height: 34, fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total</div>
                        <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: '#FFA033', paddingTop: 6 }}>
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total & Paid */}
              <div style={{ background: 'rgba(255, 149, 0, 0.1)', border: '1px solid rgba(255, 149, 0, 0.25)', padding: '10px 14px', borderRadius: 10 }}>
                <div className="flex justify-between items-center mb-2">
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Grand Total</span>
                  <span className="font-mono" style={{ fontSize: 16, fontWeight: 900, color: '#FFA033' }}>
                    {formatCurrency(purchaseGrandTotal)}
                  </span>
                </div>
                <div className="input-wrap">
                  <label className="input-label" style={{ fontSize: 11 }}>Amount Paid Now (₹)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0"
                    value={amountPaidNow}
                    onChange={e => setAmountPaidNow(e.target.value)}
                    style={{ height: 38 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setIsPurchaseModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={handleSavePurchase}>Save Bill</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SupplierProfilePage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 540, margin: '0 auto' }} className="loader" />}>
      <SupplierProfileContent />
    </Suspense>
  );
}
