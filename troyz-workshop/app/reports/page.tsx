'use client';

import { useEffect, useState } from 'react';
import {
  getAllPayments, getAllExpenses, getAllPurchases, getAllJobs, getAllCustomers, getAllSuppliers, getAllParts,
  getSetting, Payment, Expense, Purchase, Job, Customer, Supplier, Part
} from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/currency';
import { generatePDFFromElement, printCurrentReport } from '@/lib/pdf-utils';
import { callGemini, resolveGeminiKey } from '@/lib/gemini';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const IconSparkles = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
  </svg>
);

const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconVolume = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
  </svg>
);

const IconPrint = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

type PeriodFilter = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'all' | 'custom';

export default function ReportsPage() {
  const [period, setPeriod] = useState<PeriodFilter>('this_month');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [activeTab, setActiveTab] = useState<'pnl' | 'cashflow' | 'aging' | 'ai_insights'>('pnl');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [workshopName, setWorkshopName] = useState('Mithra Engineering Works (MEW)');
  const [loading, setLoading] = useState(true);

  // AI Report State
  const [aiReport, setAiReport] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const loadData = async () => {
    try {
      const [p, e, pur, j, c, s, pt, wName] = await Promise.all([
        getAllPayments(),
        getAllExpenses(),
        getAllPurchases(),
        getAllJobs(),
        getAllCustomers(),
        getAllSuppliers(),
        getAllParts(),
        getSetting('workshop_name'),
      ]);
      setPayments(p);
      setExpenses(e);
      setPurchases(pur);
      setJobs(j);
      setCustomers(c);
      setSuppliers(s);
      setParts(pt);
      if (wName) setWorkshopName(wName);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => { loadData(); };
    window.addEventListener('troyz_data_updated', handleUpdate);
    return () => window.removeEventListener('troyz_data_updated', handleUpdate);
  }, []);

  // Date range calculation
  const now = new Date();
  const getDates = () => {
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    if (period === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (period === 'last_3_months') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'last_6_months') {
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else if (period === 'all') {
      start = new Date(2020, 0, 1);
      end = new Date(2030, 11, 31);
    } else if (period === 'custom') {
      return {
        startStr: customStart,
        endStr: customEnd,
      };
    }

    return {
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0],
    };
  };

  const { startStr, endStr } = getDates();

  // Filtered dataset
  const filteredPayments = payments.filter(p => (p.date || '').split('T')[0] >= startStr && (p.date || '').split('T')[0] <= endStr);
  const filteredExpenses = expenses.filter(e => (e.date || '').split('T')[0] >= startStr && (e.date || '').split('T')[0] <= endStr);
  const filteredPurchases = purchases.filter(p => (p.date || '').split('T')[0] >= startStr && (p.date || '').split('T')[0] <= endStr);
  const filteredJobs = jobs.filter(j => (j.createdAt || '').split('T')[0] >= startStr && (j.createdAt || '').split('T')[0] <= endStr);

  // Financial Metrics
  const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalInvoiced = filteredJobs.reduce((sum, j) => sum + j.total, 0);
  const cogs = filteredPurchases.reduce((sum, p) => sum + p.total, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Expense Categories Breakdown
  const expenseByCategory: Record<string, number> = {};
  filteredExpenses.forEach(e => {
    const cat = e.category || 'other';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
  });

  // Debtors & Creditors
  const debtors = customers
    .map(c => {
      const custJobs = jobs.filter(j => j.customerId === c.id && j.status !== 'cancelled');
      const balance = custJobs.reduce((s, j) => s + j.balance, 0);
      return { customer: c, balance };
    })
    .filter(d => d.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const creditors = suppliers
    .filter(s => s.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const totalReceivables = debtors.reduce((sum, d) => sum + d.balance, 0);
  const totalPayables = creditors.reduce((sum, c) => sum + c.balance, 0);
  const lowStockCount = parts.filter(p => p.stock <= p.minStock).length;

  // AI Report Generator
  const generateAIReport = async () => {
    setAiLoading(true);
    setActiveTab('ai_insights');
    try {
      const apiKey = await resolveGeminiKey(getSetting);
      if (!apiKey) {
        setAiReport('⚠️ Please configure your Google Gemini API key in Settings to generate AI Executive Reports.');
        return;
      }

      const topDebtorNames = debtors.slice(0, 5).map(d => `${d.customer.name}: ₹${d.balance.toLocaleString('en-IN')}`).join(', ');
      const topCreditorNames = creditors.slice(0, 5).map(c => `${c.name}: ₹${c.balance.toLocaleString('en-IN')}`).join(', ');
      const topExpenseCategories = Object.entries(expenseByCategory).map(([k, v]) => `${k}: ₹${v.toLocaleString('en-IN')}`).join(', ');

      const systemPrompt = `You are MEW OS — Chief Financial & Operations AI Advisor for Mithra Engineering Works (MEW), a borewell rig engineering workshop in Tamil Nadu.
Analyze the workshop's financial data for the chosen duration (${startStr} to ${endStr}) and generate a professional, sharp, highly actionable Executive Financial & Operations Report.

Structure your response clearly with these sections:
1. 📊 EXECUTIVE FINANCIAL SUMMARY (நிதி நிலை அறிக்கை): Revenue, Expenses, Net Profit, Profit Margin % analysis.
2. 🎯 CASH RECOVERY & DEBTORS ACTION (வசூல் செய்ய வேண்டிய முக்கிய பாக்கிகள்): Specific advice on high customer balances and priority collections.
3. 💡 COST OPTIMIZATION & WORKSHOP SAVINGS (செலவு குறைக்கும் வழிகள்): Direct guidance on parts, lathe, diesel, and overhead costs.
4. 🚀 STRATEGIC GROWTH RECOMMENDATIONS (பட்டறை வளர்ச்சி யோசனைகள்): Tactical recommendations for expanding rig services, inventory management, and maximizing margins.

Format with clean headers and bullet points. Write in a clear, highly respectful professional tone with Tamil summaries where appropriate.`;

      const userMessage = `Workshop Performance Data (${startStr} to ${endStr}):
- Duration: ${period.replace(/_/g, ' ').toUpperCase()} (${startStr} to ${endStr})
- Cash Inflows (Total Revenue): ₹${totalRevenue.toLocaleString('en-IN')}
- Operating Outflows (Expenses): ₹${totalExpenses.toLocaleString('en-IN')}
- Vendor Purchases (COGS): ₹${cogs.toLocaleString('en-IN')}
- Net Operating Profit: ₹${netProfit.toLocaleString('en-IN')}
- Profit Margin: ${profitMargin.toFixed(1)}%
- Total Customer Receivables (Pending Balances): ₹${totalReceivables.toLocaleString('en-IN')} [Top: ${topDebtorNames || 'None'}]
- Total Vendor Payables: ₹${totalPayables.toLocaleString('en-IN')} [Top: ${topCreditorNames || 'None'}]
- Expense Breakdown: ${topExpenseCategories || 'None'}
- Low Stock Items: ${lowStockCount} items below threshold

Generate the complete strategic executive report now.`;

      const response = await callGemini({
        systemPrompt,
        userMessage,
        apiKey,
        temperature: 0.4,
        maxOutputTokens: 1500,
      });

      if (response && response.text) {
        setAiReport(response.text);
      } else {
        setAiReport(`📊 Executive Financial Summary (${startStr} to ${endStr}):
• Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}
• Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
• Net Profit: ₹${netProfit.toLocaleString('en-IN')} (${profitMargin.toFixed(1)}% margin)
• Customer Pending Balance: ₹${totalReceivables.toLocaleString('en-IN')}
• Supplier Payables: ₹${totalPayables.toLocaleString('en-IN')}

Recommendation: Follow up with top debtors (${topDebtorNames || 'All clear'}) to improve immediate cash liquidity.`);
      }
    } catch (e: any) {
      setAiReport('Failed to generate report: ' + (e?.message || 'Check network connection'));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSpeakReport = () => {
    if (!aiReport) return;
    const nv = typeof window !== 'undefined' ? (window as any).AndroidNativeVoice : null;
    if (isSpeaking) {
      if (nv && typeof nv.stopTTS === 'function') nv.stopTTS();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const cleanSpeech = aiReport.replace(/[#*`_~]/g, '').slice(0, 500);
    if (nv && typeof nv.speak === 'function') {
      nv.speak(cleanSpeech, 'ta-IN');
      setTimeout(() => setIsSpeaking(false), 15000);
    } else if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(cleanSpeech);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utter);
    }
  };

  const handleDownloadPDF = async () => {
    setPdfGenerating(true);
    try {
      await generatePDFFromElement('report-full-document', `MEW_Financial_Report_${startStr}_to_${endStr}`);
    } finally {
      setPdfGenerating(false);
    }
  };

  if (loading) return (
    <div style={{ maxWidth: 640, margin: '0 auto' }} className="stagger">
      {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 8 }} />)}
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 64 }} className="animate-fade-in">
      
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="t-h2">Reports & Intelligence</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Financial statements, P&L, debtors & AI analysis
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={printCurrentReport}
            title="Print Report"
            aria-label="Print Report"
          >
            <IconPrint />
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleDownloadPDF}
            disabled={pdfGenerating}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <IconDownload /> {pdfGenerating ? 'Creating...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* ── Duration Selector Pills ── */}
      <div className="card mb-4" style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
          <span>Duration (கால அளவு)</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {formatDate(startStr)} → {formatDate(endStr)}
          </span>
        </div>

        <div className="pill-scroll" style={{ padding: '0 0 6px' }}>
          {[
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'last_3_months', label: '3 Months' },
            { id: 'last_6_months', label: '6 Months' },
            { id: 'this_year', label: 'This Year' },
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: 'Custom' },
          ].map(p => (
            <button
              key={p.id}
              className="pill"
              style={period === p.id ? {
                background: 'var(--brand-dim)',
                borderColor: 'var(--brand-border)',
                color: 'var(--text-brand)',
                fontWeight: 700,
              } : undefined}
              onClick={() => setPeriod(p.id as PeriodFilter)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <div className="input-wrap">
              <label className="input-label">From Date</label>
              <input
                type="date"
                className="input input-sm"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
              />
            </div>
            <div className="input-wrap">
              <label className="input-label">To Date</label>
              <input
                type="date"
                className="input input-sm"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── AI Executive Generator Trigger ── */}
      <div
        className="card mb-4"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.06))',
          border: '1px solid rgba(139,92,246,0.3)',
          padding: '14px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--accent)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconSparkles />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                AI Executive Financial Advisor
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                Analyzes {period.replace(/_/g, ' ')} cashflow & debtors
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={generateAIReport}
            disabled={aiLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <IconSparkles /> {aiLoading ? 'Analyzing...' : 'Generate AI Report'}
          </button>
        </div>
      </div>

      {/* ── Printable & Screen Report Container ── */}
      <div id="report-full-document">

        {/* ── Printable Header Branding ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {workshopName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Executive Financial Statement · Period: {formatDate(startStr)} → {formatDate(endStr)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-brand" style={{ fontSize: 10, textTransform: 'uppercase' }}>
              {period.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* ── Summary KPI Tiles ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div className="kpi-tile">
            <div className="kpi-label">Total Inflows (வருமானம்)</div>
            <div className="kpi-value" style={{ color: 'var(--success)', fontSize: 18 }}>
              {formatCurrency(totalRevenue)}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
              {filteredPayments.length} transactions
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-label">Operating Expenses (செலவு)</div>
            <div className="kpi-value" style={{ color: 'var(--danger)', fontSize: 18 }}>
              {formatCurrency(totalExpenses)}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
              {filteredExpenses.length} entries
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-label">Net Profit (நிகர லாபம்)</div>
            <div className="kpi-value" style={{ color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: 18 }}>
              {formatCurrency(netProfit)}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Margin: {profitMargin.toFixed(1)}%
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-label">Customer Receivables (பாக்கி)</div>
            <div className="kpi-value" style={{ color: 'var(--warning)', fontSize: 18 }}>
              {formatCurrency(totalReceivables)}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
              {debtors.length} debtors
            </div>
          </div>
        </div>

        {/* ── Tab Selector ── */}
        <div className="tabs mb-4">
          <button className={`tab-btn ${activeTab === 'pnl' ? 'active' : ''}`} onClick={() => setActiveTab('pnl')}>
            P&L Statement
          </button>
          <button className={`tab-btn ${activeTab === 'aging' ? 'active' : ''}`} onClick={() => setActiveTab('aging')}>
            Debtors ({debtors.length})
          </button>
          <button className={`tab-btn ${activeTab === 'ai_insights' ? 'active' : ''}`} onClick={() => setActiveTab('ai_insights')}>
            AI Insights
          </button>
        </div>

        {/* ── TAB 1: P&L Statement ── */}
        {activeTab === 'pnl' && (
          <div className="card" style={{ padding: '8px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', padding: '10px 0 6px', borderBottom: '1px solid var(--border)' }}>
              Expense Breakdown by Category
            </div>
            {Object.keys(expenseByCategory).length === 0 ? (
              <div style={{ padding: '16px 0', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                No expenses in this period.
              </div>
            ) : (
              Object.entries(expenseByCategory).map(([cat, amt]) => {
                const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
                return (
                  <div key={cat} className="list-row" style={{ padding: '10px 0' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {cat.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {pct.toFixed(0)}% of total expenses
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(amt)}
                    </span>
                  </div>
                );
              })
            )}

            {/* Creditors Payables */}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', padding: '14px 0 6px', borderTop: '1px solid var(--border)', marginTop: 8 }}>
              Supplier Payables (கொடுக்க வேண்டியவை) · Total: {formatCurrency(totalPayables)}
            </div>
            {creditors.length === 0 ? (
              <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                All supplier accounts settled.
              </div>
            ) : (
              creditors.slice(0, 5).map(s => (
                <div key={s.id} className="list-row" style={{ padding: '8px 0' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.phone || 'Vendor'}</div>
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(s.balance)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB 2: Debtors Aging ── */}
        {activeTab === 'aging' && (
          <div className="card" style={{ padding: '8px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', padding: '10px 0 6px', borderBottom: '1px solid var(--border)' }}>
              Outstanding Customer Balances (வசூல் செய்ய வேண்டிய பாக்கிகள்)
            </div>
            {debtors.length === 0 ? (
              <div style={{ padding: '20px 0', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                🎉 No pending customer balances! All bills collected.
              </div>
            ) : (
              debtors.map(d => (
                <div key={d.customer.id} className="list-row" style={{ padding: '10px 0' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {d.customer.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      📞 {d.customer.phone} · {d.customer.address || 'Namakkal'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(d.balance)}
                    </div>
                    <a
                      href={`https://wa.me/91${(d.customer.whatsapp || d.customer.phone).replace(/[^0-9]/g, '')}?text=Vanakkam%20${encodeURIComponent(d.customer.name)},%20Mithra%20Engineering%20Works%20pending%20balance%20is%20Rs.${d.balance}.`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11, color: 'var(--success)', textDecoration: 'none', fontWeight: 600, marginTop: 2, display: 'inline-block' }}
                    >
                      Remind WhatsApp →
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB 3: AI Insights Report ── */}
        {activeTab === 'ai_insights' && (
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconSparkles /> Executive AI Analysis
              </div>
              {aiReport && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleSpeakReport}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                >
                  <IconVolume /> {isSpeaking ? 'Stop' : 'Listen'}
                </button>
              )}
            </div>

            {aiLoading ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <div className="dot-loader mb-2" style={{ justifyContent: 'center' }}>
                  <span /><span /><span />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Consulting Gemini AI with your live workshop data...
                </div>
              </div>
            ) : aiReport ? (
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  background: 'var(--bg-surface)',
                  padding: '14px',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border)',
                }}
              >
                {aiReport}
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  No report generated for this period yet.
                </div>
                <button className="btn btn-primary btn-sm" onClick={generateAIReport}>
                  <IconSparkles /> Generate AI Report Now
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
