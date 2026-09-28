'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getJob, updateJob, getCustomer, getVehicle, getPaymentsByJob, recordPayment,
  getSetting, Job, Customer, Vehicle, Payment, JobStatus, PaymentMethod
} from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/currency';
import { generatePDFFromElement } from '@/lib/pdf-utils';
import InvoiceModal from '@/components/invoice/InvoiceModal';
import { InvoiceData } from '@/lib/invoice';

function JobDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [workshopName, setWorkshopName] = useState('Mithra Engineering Works (MEW)');
  const [workshopPhone, setWorkshopPhone] = useState('+91 98765 43210');
  const [workshopAddress, setWorkshopAddress] = useState('No. 42, GST Road, Chennai, Tamil Nadu');
  const [workshopGst, setWorkshopGst] = useState('33AAAAA0000A1Z5');
  const [loading, setLoading] = useState(true);

  // Invoice Modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payRef, setPayRef] = useState('');

  const loadData = async () => {
    const j = await getJob(id);
    if (!j) {
      router.push('/customers');
      return;
    }
    setJob(j);

    const [c, v, p, wName, wPhone, wAddr, wGst] = await Promise.all([
      getCustomer(j.customerId),
      getVehicle(j.vehicleId),
      getPaymentsByJob(j.id),
      getSetting('workshop_name'),
      getSetting('workshop_phone'),
      getSetting('workshop_address'),
      getSetting('workshop_gst'),
    ]);

    if (c) setCustomer(c);
    if (v) setVehicle(v);
    setPayments(p.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    if (wName) setWorkshopName(wName);
    if (wPhone) setWorkshopPhone(wPhone);
    if (wAddr) setWorkshopAddress(wAddr);
    if (wGst) setWorkshopGst(wGst);

    setPayAmount(j.balance > 0 ? j.balance.toString() : '');
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (!job) return;
    const updated = await updateJob(job.id, { status: newStatus });
    setJob(updated);
  };

  const handleRecordPayment = async () => {
    if (!job || !customer) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return alert('Please enter a valid amount');

    await recordPayment({
      customerId: customer.id,
      jobId: job.id,
      amount: amt,
      method: payMethod,
      reference: payRef,
      note: `Payment for Job ${job.jobNo}`,
      date: new Date().toISOString().split('T')[0],
    });

    setIsPaymentModalOpen(false);
    setPayRef('');
    loadData();
  };

  if (loading || !job) return <div className="p-6"><div className="loader"></div></div>;

  const partsItems = job.items.filter(i => i.type === 'part');
  const labourItems = job.items.filter(i => i.type === 'labour' || i.type === 'service');

  return (
    <div className="stagger-children" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Action Bar (Hidden on Print) */}
      <div className="page-header no-print">
        <div className="page-header-left">
          <button className="btn btn-ghost" onClick={() => router.back()}>← Back</button>
          <div>
            <h1 className="page-title">Job Card #{job.jobNo}</h1>
            <p className="page-subtitle">Created on {formatDate(job.createdAt)}</p>
          </div>
        </div>
        <div className="page-header-right flex gap-2">
          {/* Status Dropdown */}
          <select
            className="select"
            value={job.status}
            onChange={e => handleStatusChange(e.target.value as JobStatus)}
            style={{ width: 140 }}
          >
            <option value="estimate">Estimate</option>
            <option value="active">In Progress</option>
            <option value="completed">Completed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {job.balance > 0 && (
            <button className="btn btn-primary" onClick={() => setIsPaymentModalOpen(true)}>
              💳 Record Payment
            </button>
          )}

          <button 
            className="btn" 
            onClick={() => setIsInvoiceModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(37, 211, 102, 0.25)',
            }}
          >
            💬 WhatsApp & UPI Bill
          </button>

          <button className="btn btn-secondary" onClick={() => generatePDFFromElement('invoice-sheet', `MEW-Invoice-${job?.jobNo || ''}`)}>
            📥 PDF
          </button>
        </div>
      </div>

      {/* Printable Invoice Sheet */}
      <div id="invoice-sheet" className="card print-invoice-sheet mb-8" style={{ padding: '32px' }}>
        {/* Header / Workshop Info */}
        <div className="flex justify-between items-start border-b pb-6 mb-6" style={{ borderColor: 'var(--border)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: 24 }}>🔧</span>
              <h2 className="text-h2 font-extrabold text-orange" style={{ letterSpacing: -0.5 }}>{workshopName}</h2>
            </div>
            <p className="text-sm text-muted">{workshopAddress}</p>
            <p className="text-sm text-muted">Phone: {workshopPhone} {workshopGst ? `• GSTIN: ${workshopGst}` : ''}</p>
          </div>
          <div className="text-right">
            <div className="text-h3 font-bold uppercase mb-1">Tax Invoice / Job Card</div>
            <div className="text-sm font-semibold">Job #: <span className="text-orange">{job.jobNo}</span></div>
            <div className="text-xs text-muted">Date: {formatDate(job.createdAt)}</div>
            <div className="mt-2">
              <span className={`badge badge-${job.status === 'completed' || job.status === 'delivered' ? 'success' : job.status === 'active' ? 'orange' : 'muted'} uppercase`}>
                {job.status}
              </span>
            </div>
          </div>
        </div>

        {/* Customer & Vehicle Info Grid */}
        <div className="grid grid-2 gap-4 mb-6 p-4 rounded-lg bg-surface border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <div>
            <div className="text-xs text-muted font-bold uppercase mb-1">Billed To (Customer)</div>
            <div className="font-bold text-base">{customer?.name || '—'}</div>
            <div className="text-sm text-muted">{customer?.phone || '—'}</div>
            {customer?.address && <div className="text-xs text-muted mt-1">{customer.address}</div>}
          </div>
          <div>
            <div className="text-xs text-muted font-bold uppercase mb-1">Vehicle Details</div>
            <div className="font-bold text-base uppercase text-primary">{vehicle?.regNo || '—'}</div>
            <div className="text-sm text-muted">{vehicle?.make} {vehicle?.model} {vehicle?.year ? `(${vehicle.year})` : ''}</div>
            {vehicle?.mileage && <div className="text-xs text-muted">Odometer: {vehicle.mileage.toLocaleString()} km</div>}
          </div>
        </div>

        {/* Complaints / Notes if any */}
        {job.complaint && (
          <div className="mb-6 p-3 rounded border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
            <div className="text-xs font-bold text-muted uppercase mb-1">Reported Issue / Complaints</div>
            <div className="text-sm">{job.complaint}</div>
            {job.diagnosis && (
              <div className="text-sm text-muted mt-2"><strong>Diagnosis / Action:</strong> {job.diagnosis}</div>
            )}
          </div>
        )}

        {/* Items Table */}
        <div className="table-wrapper mb-6">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Description</th>
                <th style={{ width: '15%' }}>Type</th>
                <th className="text-right" style={{ width: '15%' }}>Qty / Hrs</th>
                <th className="text-right" style={{ width: '15%' }}>Unit Rate</th>
                <th className="text-right" style={{ width: '15%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {job.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">No line items recorded.</td>
                </tr>
              ) : (
                job.items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="font-medium">{item.name}</td>
                    <td className="capitalize text-xs">
                      <span className={`badge ${item.type === 'part' ? 'badge-muted' : 'badge-orange'}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="text-right">{item.qty}</td>
                    <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right font-bold">{formatCurrency(item.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex justify-end">
          <div style={{ width: '320px' }}>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-muted">Parts Subtotal</span>
              <span>{formatCurrency(partsItems.reduce((s, i) => s + i.total, 0))}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-muted">Labour / Service</span>
              <span>{formatCurrency(labourItems.reduce((s, i) => s + i.total, 0))}</span>
            </div>
            {job.discount && job.discount > 0 ? (
              <div className="flex justify-between py-1 text-sm text-danger">
                <span>Discount</span>
                <span>-{formatCurrency(job.discount)}</span>
              </div>
            ) : null}
            <div className="divider my-2"></div>
            <div className="flex justify-between py-1 font-bold text-base">
              <span>Total Amount</span>
              <span className="text-orange">{formatCurrency(job.total)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm text-success font-semibold">
              <span>Paid Amount</span>
              <span>{formatCurrency(job.paid)}</span>
            </div>
            <div className="flex justify-between py-2 text-base font-extrabold border-t mt-1" style={{ borderColor: 'var(--border)', color: job.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
              <span>Balance Due</span>
              <span>{formatCurrency(job.balance)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Footer */}
        <div className="border-t mt-8 pt-4 text-xs text-muted" style={{ borderColor: 'var(--border)' }}>
          <p><strong>Terms:</strong> Payment is due upon delivery. Goods once sold will not be taken back. Thank you for your business!</p>
        </div>
      </div>

      {/* Payment History Section (Hidden on Print) */}
      <div className="card mb-8 no-print">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-h3">Payments Received ({payments.length})</h3>
          {job.balance > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => setIsPaymentModalOpen(true)}>
              + Record Payment
            </button>
          )}
        </div>
        {payments.length === 0 ? (
          <p className="text-muted text-sm">No payments recorded for this job yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference / Note</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{formatDate(p.date)}</td>
                    <td className="uppercase font-semibold text-xs">{p.method}</td>
                    <td>{p.reference || p.note || '—'}</td>
                    <td className="text-right font-bold text-success">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3 className="text-h3">Record Payment</h3>
              <button className="btn btn-ghost btn-icon-sm" onClick={() => setIsPaymentModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="mb-3 p-3 rounded bg-surface border" style={{ borderColor: 'var(--border)' }}>
                <div className="text-xs text-muted">Total Due: <span className="font-bold text-orange">{formatCurrency(job.balance)}</span></div>
              </div>
              <div className="form-group mb-4">
                <label className="form-label required">Amount (₹)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="Enter amount"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                />
              </div>
              <div className="form-group mb-4">
                <label className="form-label required">Payment Method</label>
                <select
                  className="select"
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="card">Card (Debit / Credit)</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Reference / Note</label>
                <input
                  className="input"
                  placeholder="e.g., UPI Ref 123456, Cheque #00012"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRecordPayment}>Save Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp & UPI Invoice Modal */}
      {isInvoiceModalOpen && job && (
        <InvoiceModal
          invoice={{
            id: job.jobNo,
            date: formatDate(job.createdAt),
            customerName: customer?.name || 'Customer',
            customerPhone: customer?.phone || '',
            vehicleNumber: vehicle?.regNo || 'Rig / Vehicle',
            vehicleModel: vehicle?.model || '',
            items: job.items.map(i => ({
              description: i.name,
              qty: i.qty,
              rate: i.unitPrice,
              amount: i.total,
            })),
            subtotal: job.subtotal,
            discount: job.discount,
            total: job.total,
            advancePaid: job.paid,
            balanceDue: job.balance,
            upiId: 'mewworkshop@okaxis',
          }}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function JobDetailPage() {
  return (
    <Suspense fallback={<div className="loading-container p-6 text-center text-muted font-bold">Loading Job Details...</div>}>
      <JobDetailContent />
    </Suspense>
  );
}
