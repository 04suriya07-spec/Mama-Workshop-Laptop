'use client';

import { useEffect, useState } from 'react';
import {
  getAllPayments, getAllExpenses, Payment, Expense,
  saveExpense, recordPayment, deletePayment, deleteExpense
} from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/currency';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconIncome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const IconExpense = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    <polyline points="17 18 23 18 23 12"/>
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const EXPENSE_CATS: Record<string, { label: string; color: string }> = {
  parts_purchase: { label: 'Parts', color: 'var(--brand)' },
  shop_supplies:  { label: 'Supplies', color: 'var(--info)' },
  salary:         { label: 'Salary', color: 'var(--success)' },
  rent:           { label: 'Rent', color: 'var(--warning)' },
  electricity:    { label: 'Utilities', color: '#A78BFA' },
  marketing:      { label: 'Marketing', color: '#F472B6' },
  other:          { label: 'Other', color: 'var(--text-muted)' },
};

const PAYMENT_METHODS: Record<string, string> = {
  cash: 'Cash', upi: 'UPI/GPay', card: 'Card', bank_transfer: 'Bank',
};

export default function MoneyPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'income' | 'expenses'>('income');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('income');

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [jobId, setJobId] = useState('');
  const [category, setCategory] = useState('shop_supplies');
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    Promise.all([getAllPayments(), getAllExpenses()])
      .then(([p, e]) => { setPayments(p); setExpenses(e); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const h = () => loadData();
    window.addEventListener('troyz_data_updated', h);
    return () => window.removeEventListener('troyz_data_updated', h);
  }, []);

  const handleDeletePayment = async (id: string, amt: number) => {
    if (confirm(`Delete this income record of ${formatCurrency(amt)}?`)) {
      await deletePayment(id);
      loadData();
    }
  };

  const handleDeleteExpense = async (id: string, amt: number) => {
    if (confirm(`Delete this expense of ${formatCurrency(amt)}?`)) {
      await deleteExpense(id);
      loadData();
    }
  };

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return alert('Enter a valid amount');
    setSaving(true);
    if (modalType === 'income') {
      await recordPayment({
        customerId: 'general',
        jobId: jobId || undefined,
        amount: val,
        method: method as any,
        note,
        date: new Date().toISOString().split('T')[0],
      });
    } else {
      await saveExpense({
        amount: val,
        category: category as any,
        description: note,
        method: 'cash',
        date: new Date().toISOString().split('T')[0],
      });
    }
    setIsModalOpen(false);
    setTab(modalType === 'income' ? 'income' : 'expenses');
    setAmount(''); setNote(''); setJobId('');
    setSaving(false);
    loadData();
  };

  const openModal = (type: 'income' | 'expense') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const totalIncome = payments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto' }} className="stagger">
        {[1,2,3].map(i => <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 8 }} />)}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 56 }} className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="t-h2">Money</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => openModal('expense')}>
            <IconPlus /> Expense
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => openModal('income')}>
            <IconPlus /> Income
          </button>
        </div>
      </div>

      {/* ── Summary tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div
          className="kpi-tile"
          onClick={() => setTab('income')}
          style={{ cursor: 'pointer', border: tab === 'income' ? '1px solid var(--success-bdr)' : undefined }}
        >
          <div className="kpi-icon" style={{ background: 'var(--success-dim)', color: 'var(--success)' }}>
            <IconIncome />
          </div>
          <div className="kpi-label">Total Income</div>
          <div className="kpi-value" style={{ fontSize: 18, color: 'var(--success)' }}>
            {formatCurrency(totalIncome)}
          </div>
        </div>
        <div
          className="kpi-tile"
          onClick={() => setTab('expenses')}
          style={{ cursor: 'pointer', border: tab === 'expenses' ? '1px solid var(--danger-bdr)' : undefined }}
        >
          <div className="kpi-icon" style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}>
            <IconExpense />
          </div>
          <div className="kpi-label">Total Expenses</div>
          <div className="kpi-value" style={{ fontSize: 18, color: 'var(--danger)' }}>
            {formatCurrency(totalExpenses)}
          </div>
        </div>
      </div>

      {/* ── Tab selector ── */}
      <div className="tabs mb-4">
        <button className={`tab-btn ${tab === 'income' ? 'active' : ''}`} onClick={() => setTab('income')}>
          Income ({payments.length})
        </button>
        <button className={`tab-btn ${tab === 'expenses' ? 'active' : ''}`} onClick={() => setTab('expenses')}>
          Expenses ({expenses.length})
        </button>
      </div>

      {/* ── Income list ── */}
      {tab === 'income' && (
        payments.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><IconIncome /></div>
              <div className="empty-state-title">No income records</div>
              <div className="empty-state-sub">Record payments received from customers.</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => openModal('income')}>
                <IconPlus /> Record Income
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '4px 16px' }}>
            {payments.map(p => (
              <div key={p.id} className="txn-row">
                <div className="txn-icon" style={{ background: 'var(--success-dim)', color: 'var(--success)' }}>
                  <IconIncome />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {p.note || 'Payment received'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                    {formatDate(p.date)} · {PAYMENT_METHODS[p.method] ?? p.method}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>
                    +{formatCurrency(p.amount)}
                  </span>
                  <button
                    onClick={() => handleDeletePayment(p.id, p.amount)}
                    style={{
                      width: 26, height: 26, borderRadius: 6,
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Delete"
                    aria-label="Delete income record"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Expenses list ── */}
      {tab === 'expenses' && (
        expenses.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><IconExpense /></div>
              <div className="empty-state-title">No expenses recorded</div>
              <div className="empty-state-sub">Track your workshop operating costs here.</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => openModal('expense')}>
                <IconPlus /> Add Expense
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '4px 16px' }}>
            {expenses.map(e => {
              const cat = EXPENSE_CATS[e.category] ?? { label: e.category, color: 'var(--text-muted)' };
              return (
                <div key={e.id} className="txn-row">
                  <div className="txn-icon" style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}>
                    <IconExpense />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {e.description || cat.label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span className="badge badge-muted" style={{ fontSize: 10, padding: '1px 6px', color: cat.color }}>
                        {cat.label}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(e.date)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                      -{formatCurrency(e.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(e.id, e.amount)}
                      style={{
                        width: 26, height: 26, borderRadius: 6,
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        color: 'var(--text-muted)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title="Delete"
                      aria-label="Delete expense"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Add Sheet ── */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">
              {modalType === 'income' ? 'Record Income' : 'Add Expense'}
            </div>
            <div className="modal-body">
              <div className="input-wrap">
                <label className="input-label">Amount (₹) *</label>
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  autoFocus
                />
              </div>

              {modalType === 'income' && (
                <>
                  <div className="input-wrap">
                    <label className="input-label">Payment Method</label>
                    <select className="input" value={method} onChange={e => setMethod(e.target.value)}>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / GPay</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div className="input-wrap">
                    <label className="input-label">Link to Job ID (optional)</label>
                    <input
                      className="input"
                      placeholder="e.g. JOB-1234"
                      value={jobId}
                      onChange={e => setJobId(e.target.value)}
                    />
                  </div>
                </>
              )}

              {modalType === 'expense' && (
                <div className="input-wrap">
                  <label className="input-label">Category *</label>
                  <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="parts_purchase">Parts Purchase</option>
                    <option value="shop_supplies">Shop Supplies</option>
                    <option value="salary">Salary</option>
                    <option value="rent">Rent</option>
                    <option value="electricity">Electricity / Utilities</option>
                    <option value="marketing">Marketing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              <div className="input-wrap">
                <label className="input-label">{modalType === 'income' ? 'Note' : 'Description'}</label>
                <input
                  className="input"
                  placeholder="Optional note..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button
                  className="btn btn-primary btn-full"
                  onClick={handleSave}
                  disabled={saving || !amount}
                >
                  {saving ? 'Saving...' : modalType === 'income' ? 'Save Income' : 'Save Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
