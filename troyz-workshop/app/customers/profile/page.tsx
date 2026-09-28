'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCustomer, getVehiclesByCustomer, getJobsByCustomer, getPaymentsByCustomer,
  getExpensesByCustomer, saveVehicle, recordPayment, saveExpense,
  deleteCustomer, deleteVehicle, deleteJob, deletePayment, deleteExpense,
  Customer, Vehicle, Job, Payment, Expense, PaymentMethod
} from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/currency';
import { generatePDFFromElement } from '@/lib/pdf-utils';

// ─── Apple SF Pro Icons ────────────────────────────────────────────────────────
const IconBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.00 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.07 6.07l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
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

const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconWrench = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </svg>
);

const IconTruck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

function CustomerProfileContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'advances' | 'vehicles' | 'jobs' | 'settlement'>('advances');
  const [selectedRigFilter, setSelectedRigFilter] = useState<string>('all');

  // Modal 1: Add Vehicle
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vMake, setVMake] = useState('Ashok Leyland');
  const [vModel, setVModel] = useState('PRD 1000');
  const [vRegNo, setVRegNo] = useState('');
  const [vRigType, setVRigType] = useState('DTH Rig');
  const [vCompressor, setVCompressor] = useState('ELGi 1100 CFM / 300 PSI');
  const [vChassisNo, setVChassisNo] = useState('');

  // Modal 2: Receive Advance
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advAmount, setAdvAmount] = useState('');
  const [advMethod, setAdvMethod] = useState<PaymentMethod>('upi');
  const [advDate, setAdvDate] = useState(new Date().toISOString().split('T')[0]);
  const [advNote, setAdvNote] = useState('');
  const [advVehicleId, setAdvVehicleId] = useState('');

  // Modal 3: Add Expense
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expVehicleId, setExpVehicleId] = useState('');
  const [expType, setExpType] = useState('lathe_work');
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expMethod, setExpMethod] = useState<PaymentMethod>('cash');
  const [expBillNo, setExpBillNo] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expNotes, setExpNotes] = useState('');

  const loadData = async () => {
    const c = await getCustomer(id);
    if (!c) {
      router.push('/customers');
      return;
    }
    setCustomer(c);

    const [v, j, p, e] = await Promise.all([
      getVehiclesByCustomer(id),
      getJobsByCustomer(id),
      getPaymentsByCustomer(id),
      getExpensesByCustomer(id),
    ]);

    setVehicles(v);
    setJobs(j.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setPayments(p.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setExpenses(e.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    if (v.length > 0) {
      setAdvVehicleId(v[0].id);
      setExpVehicleId(v[0].id);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => { loadData(); };
    window.addEventListener('troyz_data_updated', handleUpdate);
    return () => window.removeEventListener('troyz_data_updated', handleUpdate);
  }, [id]);

  const handleSaveVehicle = async () => {
    if (!vMake || !vModel || !vRegNo) return alert('Make, Model, and Registration Number are required.');
    await saveVehicle({
      customerId: id,
      make: vMake,
      model: vModel,
      regNo: vRegNo.toUpperCase(),
      rigType: vRigType,
      compressorDetails: vCompressor,
      rigChassisNo: vChassisNo,
    });
    setIsVehicleModalOpen(false);
    setVRegNo(''); setVChassisNo('');
    loadData();
  };

  const handleSaveAdvance = async () => {
    const amt = parseFloat(advAmount);
    if (!amt || amt <= 0) return alert('Please enter a valid advance amount.');

    await recordPayment({
      customerId: id,
      vehicleId: advVehicleId || undefined,
      paymentType: 'advance',
      amount: amt,
      method: advMethod,
      date: advDate,
      note: advNote || 'Advance received',
    });

    setIsAdvanceModalOpen(false);
    setAdvAmount(''); setAdvNote('');
    loadData();
  };

  const handleSaveExpense = async () => {
    const amt = parseFloat(expAmount);
    if (!amt || amt <= 0) return alert('Please enter a valid expense amount.');
    if (!expDescription.trim()) return alert('Please enter an expense description.');

    await saveExpense({
      category: 'customer_vehicle_direct',
      customerId: id,
      vehicleId: expVehicleId || undefined,
      expenseType: expType,
      description: expDescription,
      amount: amt,
      method: expMethod,
      billNo: expBillNo,
      date: expDate,
      notes: expNotes,
    });

    setIsExpenseModalOpen(false);
    setExpDescription(''); setExpAmount(''); setExpBillNo(''); setExpNotes('');
    loadData();
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;
    if (confirm(`Are you sure you want to delete customer "${customer.name}"? This cannot be undone.`)) {
      await deleteCustomer(id);
      router.push('/customers');
    }
  };

  const handleDeleteVehicle = async (vehicleId: string, regNo: string) => {
    if (confirm(`Are you sure you want to delete rig "${regNo}"?`)) {
      await deleteVehicle(vehicleId);
      loadData();
    }
  };

  const handleDeleteLedgerItem = async (itemId: string, isAdvance: boolean, amount: number) => {
    const label = isAdvance ? `advance of ${formatCurrency(amount)}` : `expense of ${formatCurrency(amount)}`;
    if (confirm(`Are you sure you want to delete this ${label}?`)) {
      if (isAdvance) {
        await deletePayment(itemId);
      } else {
        await deleteExpense(itemId);
      }
      loadData();
    }
  };

  const handleDeleteJob = async (jobId: string, jobNo: string) => {
    if (confirm(`Are you sure you want to delete job card "${jobNo}"?`)) {
      await deleteJob(jobId);
      loadData();
    }
  };

  if (loading || !customer) return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 96 }} className="stagger">
      {[1, 2, 3].map(i => <div key={i} className="skeleton skeleton-card" style={{ marginBottom: 12 }} />)}
    </div>
  );

  // Financial Calculations
  const totalAdvancesReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDirectExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalWorkshopJobsBilled = jobs.reduce((sum, j) => sum + j.total, 0);
  const totalCombinedCosts = totalDirectExpenses + totalWorkshopJobsBilled;

  const advanceRemaining = Math.max(0, totalAdvancesReceived - totalCombinedCosts);
  const extraDueNeeded = Math.max(0, totalCombinedCosts - totalAdvancesReceived);

  const utilizationPercent = totalAdvancesReceived > 0
    ? Math.min(100, Math.round((totalCombinedCosts / totalAdvancesReceived) * 100))
    : totalCombinedCosts > 0 ? 100 : 0;

  const getExpTypeLabel = (type?: string) => {
    const map: Record<string, string> = {
      lathe_work: 'Lathe Turning',
      welding: 'Welding & Fabrication',
      hydraulic_hose: 'Hydraulic Hose',
      compressor_service: 'Compressor Work',
      outside_parts: 'Outside Parts',
      diesel_fuel: 'Diesel & Fuel',
      outside_labour: 'Outside Mechanic',
      hardware: 'Hardware & Fittings',
    };
    return map[type || ''] || 'Direct Expense';
  };

  const combinedLedger = [
    ...payments.map(p => ({
      id: p.id,
      date: p.date,
      isAdvance: true,
      category: 'Advance Deposit',
      desc: p.note || 'Advance Deposit',
      vehicleId: p.vehicleId,
      vehicle: vehicles.find(v => v.id === p.vehicleId)?.regNo || 'All Rigs',
      mode: p.method.toUpperCase(),
      inAmt: p.amount,
      outAmt: 0,
    })),
    ...expenses.map(e => ({
      id: e.id,
      date: e.date,
      isAdvance: false,
      category: getExpTypeLabel(e.expenseType),
      desc: e.description + (e.notes ? ` — ${e.notes}` : ''),
      vehicleId: e.vehicleId,
      vehicle: vehicles.find(v => v.id === e.vehicleId)?.regNo || 'Direct Work',
      mode: e.billNo ? `Bill #${e.billNo}` : e.method.toUpperCase(),
      inAmt: 0,
      outAmt: e.amount,
    })),
  ]
    .filter(item => selectedRigFilter === 'all' || item.vehicleId === selectedRigFilter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }} className="animate-fade-in">
      
      {/* ── Top Bar: Back & Delete ── */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => router.push('/customers')}
          className="btn btn-ghost btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 13 }}
        >
          <IconBack /> Customers
        </button>
        <button
          onClick={handleDeleteCustomer}
          style={{
            background: 'rgba(255, 69, 58, 0.12)',
            border: '1px solid rgba(255, 69, 58, 0.3)',
            color: '#FF453A',
            borderRadius: 10,
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <IconTrash /> Delete
        </button>
      </div>

      {/* ── Apple Pro Hero Header ── */}
      <div className="hero-card mb-4" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(135deg, #FF9500 0%, #FF5E00 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 900, color: '#FFF', flexShrink: 0,
            boxShadow: '0 4px 16px rgba(255, 149, 0, 0.35)',
          }}>
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="t-h1" style={{ fontSize: 20, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {customer.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600 }}
                >
                  <IconPhone /> {customer.phone}
                </a>
              )}
              {customer.whatsapp && (
                <a
                  href={`https://wa.me/91${customer.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 11, color: '#30D158', fontWeight: 700, textDecoration: 'none', background: 'rgba(48, 209, 88, 0.12)', padding: '2px 8px', borderRadius: 6 }}
                >
                  WhatsApp
                </a>
              )}
              <span className="badge badge-brand" style={{ fontSize: 10, padding: '2px 7px' }}>
                {vehicles.length} {vehicles.length === 1 ? 'rig' : 'rigs'}
              </span>
            </div>
          </div>
        </div>

        {/* 2 Primary Glass Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            type="button"
            onClick={() => setIsAdvanceModalOpen(true)}
            style={{
              height: 44,
              borderRadius: 14,
              border: '1px solid rgba(48, 209, 88, 0.4)',
              background: 'linear-gradient(135deg, rgba(48, 209, 88, 0.22) 0%, rgba(48, 209, 88, 0.08) 100%)',
              color: '#30D158',
              fontWeight: 800,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(48, 209, 88, 0.15)',
            }}
          >
            <IconPlus /> Advance In
          </button>
          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            style={{
              height: 44,
              borderRadius: 14,
              border: '1px solid rgba(255, 149, 0, 0.4)',
              background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.22) 0%, rgba(255, 149, 0, 0.08) 100%)',
              color: '#FFA033',
              fontWeight: 800,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255, 149, 0, 0.15)',
            }}
          >
            <IconPlus /> Add Expense
          </button>
        </div>
      </div>

      {/* ── Net Balance Card ── */}
      <div
        className="card mb-3"
        style={{
          padding: '16px 18px',
          border: `1.5px solid ${extraDueNeeded > 0 ? 'rgba(255, 69, 58, 0.4)' : 'rgba(48, 209, 88, 0.4)'}`,
          background: extraDueNeeded > 0
            ? 'linear-gradient(135deg, rgba(255, 69, 58, 0.14) 0%, rgba(18, 20, 30, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(48, 209, 88, 0.14) 0%, rgba(18, 20, 30, 0.95) 100%)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: extraDueNeeded > 0 ? '#FF453A' : '#30D158' }}>
              {extraDueNeeded > 0 ? 'Client Balance Due' : 'Advance Remaining'}
            </div>
            <div className="t-num-xl font-mono" style={{ color: extraDueNeeded > 0 ? '#FF453A' : '#30D158', marginTop: 2 }}>
              {extraDueNeeded > 0 ? formatCurrency(extraDueNeeded) : formatCurrency(advanceRemaining)}
            </div>
          </div>
          <span
            className="badge"
            style={{
              background: extraDueNeeded > 0 ? 'rgba(255, 69, 58, 0.2)' : 'rgba(48, 209, 88, 0.2)',
              color: extraDueNeeded > 0 ? '#FF453A' : '#30D158',
              fontWeight: 800,
              fontSize: 11,
              padding: '4px 10px',
            }}
          >
            {extraDueNeeded > 0 ? 'Payment Due' : 'Credit Surplus'}
          </span>
        </div>

        {/* Meter bar */}
        {totalAdvancesReceived > 0 && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div className="flex justify-between" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
              <span>Consumed: {utilizationPercent}%</span>
              <span>{formatCurrency(totalCombinedCosts)} / {formatCurrency(totalAdvancesReceived)}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${utilizationPercent}%`,
                background: utilizationPercent >= 100 ? '#FF453A' : 'linear-gradient(90deg, #30D158 0%, #FF9500 100%)',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── 3 Jewel-Tone KPI Tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        <div className="kpi-tile kpi-tile-green" style={{ padding: '10px 12px' }}>
          <div className="kpi-tile-label" style={{ fontSize: 10 }}>1. Advances</div>
          <div className="kpi-tile-val font-mono" style={{ fontSize: 15, marginTop: 2 }}>{formatCurrency(totalAdvancesReceived)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{payments.length} in</div>
        </div>

        <div className="kpi-tile kpi-tile-red" style={{ padding: '10px 12px' }}>
          <div className="kpi-tile-label" style={{ fontSize: 10 }}>2. Expenses</div>
          <div className="kpi-tile-val font-mono" style={{ fontSize: 15, marginTop: 2 }}>{formatCurrency(totalDirectExpenses)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{expenses.length} bills</div>
        </div>

        <div className="kpi-tile kpi-tile-purple" style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => setActiveTab('jobs')}>
          <div className="kpi-tile-label" style={{ fontSize: 10 }}>3. Jobs Billed</div>
          <div className="kpi-tile-val font-mono" style={{ fontSize: 15, marginTop: 2 }}>{formatCurrency(totalWorkshopJobsBilled)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{jobs.length} jobs</div>
        </div>
      </div>

      {/* ── Horizontal Navigation Pills ── */}
      <div className="pill-scroll mb-3">
        {[
          { id: 'advances', label: `Ledger (${payments.length + expenses.length})` },
          { id: 'vehicles', label: `Bore Rigs (${vehicles.length})` },
          { id: 'jobs', label: `Work Orders (${jobs.length})` },
          { id: 'settlement', label: 'Settlement Bill' },
        ].map(tab => (
          <button
            key={tab.id}
            className="pill"
            style={activeTab === tab.id ? {
              background: 'var(--brand-dim)',
              borderColor: 'var(--brand-border)',
              color: 'var(--text-brand)',
              fontWeight: 700,
            } : undefined}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: LEDGER ── */}
      {activeTab === 'advances' && (
        <div>
          {vehicles.length > 1 && (
            <div className="pill-scroll mb-3" style={{ paddingBottom: 4 }}>
              <button
                className="pill"
                style={selectedRigFilter === 'all' ? { background: 'var(--bg-card)', color: '#FFF', fontWeight: 700 } : { fontSize: 11 }}
                onClick={() => setSelectedRigFilter('all')}
              >
                All Rigs
              </button>
              {vehicles.map(v => (
                <button
                  key={v.id}
                  className="pill"
                  style={selectedRigFilter === v.id ? { background: 'var(--bg-card)', color: '#FFF', fontWeight: 700 } : { fontSize: 11 }}
                  onClick={() => setSelectedRigFilter(v.id)}
                >
                  {v.regNo}
                </button>
              ))}
            </div>
          )}

          {combinedLedger.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon"><IconWrench /></div>
                <div className="empty-state-title">No transactions yet</div>
                <div className="empty-state-sub">Log customer advances or outside vehicle repair expenses.</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setIsAdvanceModalOpen(true)}>+ Advance</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsExpenseModalOpen(true)}>+ Expense</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '4px 16px' }}>
              {combinedLedger.map(item => (
                <div key={item.id} className="list-row" style={{ padding: '12px 0' }}>
                  <div
                    className="list-avatar-sq"
                    style={{
                      background: item.isAdvance ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                      color: item.isAdvance ? '#30D158' : '#FF453A',
                    }}
                  >
                    {item.isAdvance ? <IconPlus /> : <IconWrench />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.category}
                      </span>
                      <span className="badge badge-muted" style={{ fontSize: 9, padding: '1px 5px' }}>
                        {item.vehicle}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.desc}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatDate(item.date)} · {item.mode}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: item.isAdvance ? '#30D158' : '#FF453A',
                      }}
                    >
                      {item.isAdvance ? `+${formatCurrency(item.inAmt)}` : `-${formatCurrency(item.outAmt)}`}
                    </div>
                    <button
                      onClick={() => handleDeleteLedgerItem(item.id, item.isAdvance, item.inAmt || item.outAmt)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        marginTop: 4,
                      }}
                      title="Delete entry"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: BORE RIGS ── */}
      {activeTab === 'vehicles' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-h2" style={{ fontSize: 16 }}>Bore Rigs ({vehicles.length})</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setIsVehicleModalOpen(true)}>
              <IconPlus /> Add Rig
            </button>
          </div>

          {vehicles.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon"><IconTruck /></div>
                <div className="empty-state-title">No rigs registered</div>
                <div className="empty-state-sub">Add borewell trucks and compressor units for this client.</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => setIsVehicleModalOpen(true)}>
                  + Add First Rig
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {vehicles.map(v => {
                const vExp = expenses.filter(e => e.vehicleId === v.id);
                const vTotalExp = vExp.reduce((sum, e) => sum + e.amount, 0);
                const vJobs = jobs.filter(j => j.vehicleId === v.id);

                return (
                  <div key={v.id} className="card" style={{ padding: '14px 16px' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                          {v.regNo}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-brand)', fontWeight: 600, marginTop: 1 }}>
                          {v.rigType || 'Bore Rig'} · {v.make} {v.model}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Outside Exp.</div>
                        <div className="font-mono" style={{ fontSize: 13, fontWeight: 800, color: '#FF453A' }}>
                          {formatCurrency(vTotalExp)}
                        </div>
                      </div>
                    </div>

                    {v.compressorDetails && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: 8, marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                        Compressor: {v.compressorDetails}
                      </div>
                    )}

                    <div className="flex items-center justify-between" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {vJobs.length} jobs · {vExp.length} expenses
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setExpVehicleId(v.id); setIsExpenseModalOpen(true); }}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                        >
                          + Expense
                        </button>
                        <button
                          onClick={() => handleDeleteVehicle(v.id, v.regNo)}
                          style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: 'rgba(255, 69, 58, 0.12)', border: '1px solid rgba(255, 69, 58, 0.3)',
                            color: '#FF453A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                          title="Delete rig"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: JOBS ── */}
      {activeTab === 'jobs' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-h2" style={{ fontSize: 16 }}>Work Orders ({jobs.length})</h2>
            <button className="btn btn-primary btn-sm" onClick={() => router.push(`/work/new?customerId=${id}`)}>
              <IconPlus /> New Job
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon"><IconWrench /></div>
                <div className="empty-state-title">No job cards billed</div>
                <div className="empty-state-sub">Create in-house service work orders for this customer.</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => router.push(`/work/new?customerId=${id}`)}>
                  + Create Job Card
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '4px 16px' }}>
              {jobs.map(j => {
                const v = vehicles.find(veh => veh.id === j.vehicleId);
                return (
                  <div key={j.id} className="list-row" style={{ padding: '12px 0' }}>
                    <div className="list-avatar-sq" style={{ background: 'var(--info-dim)', color: 'var(--info)' }}>
                      <IconWrench />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Link href={`/work/detail?id=${j.id}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
                          {j.jobNo}
                        </Link>
                        <span className="badge badge-brand" style={{ fontSize: 9, padding: '1px 5px' }}>
                          {j.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {j.complaint || 'Workshop Service'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {formatDate(j.createdAt)} {v ? `· ${v.regNo}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="font-mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {formatCurrency(j.total)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
                        <Link href={`/work/detail?id=${j.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 6px' }}>
                          Bill →
                        </Link>
                        <button
                          onClick={() => handleDeleteJob(j.id, j.jobNo)}
                          style={{
                            background: 'transparent', border: 'none',
                            color: 'var(--text-muted)', cursor: 'pointer', padding: '2px'
                          }}
                          title="Delete job"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: SETTLEMENT SHEET ── */}
      {activeTab === 'settlement' && (
        <div className="space-y-3">
          <div className="flex justify-end mb-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => generatePDFFromElement('settlement-sheet', `MEW-Settlement-${customer?.name || ''}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <IconDownload /> Download Settlement PDF
            </button>
          </div>

          <div id="settlement-sheet" className="card" style={{ padding: '18px 20px' }}>
            <div className="flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, marginBottom: 14 }}>
              <div>
                <h3 className="t-h2" style={{ fontSize: 16 }}>Settlement & Cost Sheet</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {customer.name} ({customer.phone})
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
                {formatDate(new Date().toISOString())}
              </div>
            </div>

            {/* Advances Summary */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#30D158', marginBottom: 6 }}>
                1. Advances Received (+)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total ({payments.length} deposits)</span>
                <span className="font-mono" style={{ fontWeight: 800, color: '#30D158' }}>+{formatCurrency(totalAdvancesReceived)}</span>
              </div>
            </div>

            {/* Expenses Summary */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#FF453A', marginBottom: 6 }}>
                2. Direct Outside Expenses (-)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Lathe, Hose, Parts, Diesel</span>
                <span className="font-mono" style={{ fontWeight: 800, color: '#FF453A' }}>-{formatCurrency(totalDirectExpenses)}</span>
              </div>
            </div>

            {/* Workshop Jobs Summary */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#BF5AF2', marginBottom: 6 }}>
                3. Workshop Service Bills (-)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>In-house Job Cards ({jobs.length})</span>
                <span className="font-mono" style={{ fontWeight: 800, color: '#BF5AF2' }}>-{formatCurrency(totalWorkshopJobsBilled)}</span>
              </div>
            </div>

            {/* Net Total */}
            <div style={{ paddingTop: 12, borderTop: '1.5px solid rgba(255,255,255,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                {extraDueNeeded > 0 ? 'Net Balance Due to Workshop' : 'Net Advance Remaining'}
              </span>
              <span className="font-mono" style={{ fontSize: 18, fontWeight: 900, color: extraDueNeeded > 0 ? '#FF453A' : '#30D158' }}>
                {extraDueNeeded > 0 ? formatCurrency(extraDueNeeded) : formatCurrency(advanceRemaining)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD ADVANCE ── */}
      {isAdvanceModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAdvanceModalOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Receive Advance Deposit</div>
            <div className="modal-body">
              <div className="input-wrap">
                <label className="input-label">Amount (₹) *</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 50000"
                  value={advAmount}
                  onChange={e => setAdvAmount(e.target.value)}
                  autoFocus
                />
              </div>

              {vehicles.length > 0 && (
                <div className="input-wrap">
                  <label className="input-label">Select Bore Rig (Optional)</label>
                  <select
                    className="input"
                    value={advVehicleId}
                    onChange={e => setAdvVehicleId(e.target.value)}
                  >
                    <option value="">All Rigs / General Deposit</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.regNo} ({v.rigType})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="input-wrap">
                <label className="input-label">Payment Mode</label>
                <select
                  className="input"
                  value={advMethod}
                  onChange={e => setAdvMethod(e.target.value as PaymentMethod)}
                >
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank NEFT/RTGS</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div className="input-wrap">
                <label className="input-label">Date</label>
                <input
                  className="input"
                  type="date"
                  value={advDate}
                  onChange={e => setAdvDate(e.target.value)}
                />
              </div>

              <div className="input-wrap">
                <label className="input-label">Note / Reference</label>
                <input
                  className="input"
                  placeholder="e.g. Received via GPay for rig turning"
                  value={advNote}
                  onChange={e => setAdvNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setIsAdvanceModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={handleSaveAdvance}>Save Advance</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD EXPENSE ── */}
      {isExpenseModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsExpenseModalOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Record Vehicle Expense</div>
            <div className="modal-body">
              <div className="input-wrap">
                <label className="input-label">Expense Category *</label>
                <select
                  className="input"
                  value={expType}
                  onChange={e => setExpType(e.target.value)}
                >
                  <option value="lathe_work">Lathe Turning</option>
                  <option value="welding">Welding & Fabrication</option>
                  <option value="hydraulic_hose">Hydraulic Hose</option>
                  <option value="compressor_service">Compressor Service</option>
                  <option value="outside_parts">Outside Spare Parts</option>
                  <option value="diesel_fuel">Diesel / Fuel</option>
                  <option value="outside_labour">Outside Mechanic / Labour</option>
                  <option value="hardware">Hardware & Fittings</option>
                </select>
              </div>

              <div className="input-wrap">
                <label className="input-label">Description / Vendor Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Sri Balaji Lathe - Top head bushing"
                  value={expDescription}
                  onChange={e => setExpDescription(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="input-wrap">
                <label className="input-label">Amount (₹) *</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 4500"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                />
              </div>

              {vehicles.length > 0 && (
                <div className="input-wrap">
                  <label className="input-label">Assigned Rig</label>
                  <select
                    className="input"
                    value={expVehicleId}
                    onChange={e => setExpVehicleId(e.target.value)}
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.regNo} ({v.rigType})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="input-wrap">
                  <label className="input-label">Bill / Receipt #</label>
                  <input
                    className="input"
                    placeholder="e.g. 1042"
                    value={expBillNo}
                    onChange={e => setExpBillNo(e.target.value)}
                  />
                </div>
                <div className="input-wrap">
                  <label className="input-label">Date</label>
                  <input
                    className="input"
                    type="date"
                    value={expDate}
                    onChange={e => setExpDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setIsExpenseModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={handleSaveExpense}>Save Expense</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD BORE RIG ── */}
      {isVehicleModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsVehicleModalOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Register Bore Rig</div>
            <div className="modal-body">
              <div className="input-wrap">
                <label className="input-label">Vehicle / Rig Reg # *</label>
                <input
                  className="input"
                  placeholder="e.g. TN 28 AB 1234"
                  value={vRegNo}
                  onChange={e => setVRegNo(e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="input-wrap">
                  <label className="input-label">Chassis Make</label>
                  <input
                    className="input"
                    placeholder="Ashok Leyland"
                    value={vMake}
                    onChange={e => setVMake(e.target.value)}
                  />
                </div>
                <div className="input-wrap">
                  <label className="input-label">Rig Model</label>
                  <input
                    className="input"
                    placeholder="PRD 1000"
                    value={vModel}
                    onChange={e => setVModel(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-wrap">
                <label className="input-label">Compressor Details</label>
                <input
                  className="input"
                  placeholder="e.g. ELGi 1100 CFM / 300 PSI"
                  value={vCompressor}
                  onChange={e => setVCompressor(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setIsVehicleModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={handleSaveVehicle}>Register Rig</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function CustomerProfilePage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 540, margin: '0 auto' }} className="loader" />}>
      <CustomerProfileContent />
    </Suspense>
  );
}
