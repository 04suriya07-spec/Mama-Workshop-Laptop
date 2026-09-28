'use client';

import React, { useState } from 'react';
import { InvoiceData, formatWhatsAppInvoiceText, openWhatsAppInvoice, buildUpiUrl, getUpiQrCodeUrl } from '@/lib/invoice';

interface InvoiceModalProps {
  invoice: InvoiceData;
  onClose: () => void;
}

export default function InvoiceModal({ invoice, onClose }: InvoiceModalProps) {
  const [lang, setLang] = useState<'ta' | 'en'>('ta');
  const [copied, setCopied] = useState(false);
  const [customUpi, setCustomUpi] = useState(invoice.upiId || 'mewworkshop@okaxis');

  const upiUrl = buildUpiUrl({
    upiId: customUpi,
    payeeName: 'Mama Engineering Works',
    amount: invoice.balanceDue,
    transactionNote: `Bill ${invoice.id} - ${invoice.vehicleNumber}`,
  });

  const qrCodeUrl = getUpiQrCodeUrl(upiUrl, 220);

  const handleWhatsAppShare = () => {
    const text = formatWhatsAppInvoiceText({ ...invoice, upiId: customUpi }, lang);
    openWhatsAppInvoice(invoice.customerPhone || '', text);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(upiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div 
        className="modal-sheet"
        onClick={e => e.stopPropagation()} 
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #FF9500 0%, #FF5E00 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px' }}>
              📄
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Tax Invoice / Job Card
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                #{invoice.id} • {invoice.date}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>

        {/* Language & Actions Switcher */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '12px' }}>
          <button
            onClick={() => setLang('ta')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              background: lang === 'ta' ? 'var(--bg-card)' : 'transparent',
              color: lang === 'ta' ? 'var(--text-brand)' : 'var(--text-muted)',
              boxShadow: lang === 'ta' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            தமிழ் WhatsApp
          </button>
          <button
            onClick={() => setLang('en')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              background: lang === 'en' ? 'var(--bg-card)' : 'transparent',
              color: lang === 'en' ? 'var(--text-brand)' : 'var(--text-muted)',
              boxShadow: lang === 'en' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            English WhatsApp
          </button>
        </div>

        {/* Printable / Preview Invoice Box */}
        <div 
          id="printable-invoice"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Workshop Details */}
          <div style={{ borderBottom: '1px dashed var(--border-medium)', paddingBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.3px' }}>
                MAMA ENGINEERING WORKS
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Bore Rig & Hydraulic Specialist • Tamil Nadu
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                GSTIN: 33ABCDE1234F1Z5 • 📞 +91 98427 12345
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', background: 'rgba(255,149,0,0.15)', color: '#EA580C', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                ORIGINAL BILL
              </span>
            </div>
          </div>

          {/* Customer & Rig Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '10px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Client:</span>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{invoice.customerName || 'Walk-in Client'}</div>
              {invoice.customerPhone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{invoice.customerPhone}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'var(--text-muted)' }}>Vehicle / Rig:</span>
              <div style={{ fontWeight: 800, color: 'var(--text-brand)' }}>{invoice.vehicleNumber}</div>
              {invoice.vehicleModel && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{invoice.vehicleModel}</div>}
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              <span>Item / Labor Description</span>
              <span>Amount</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {invoice.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.description}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>x{item.qty}</span>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>₹{item.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Breakdown */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              <span>₹{invoice.total.toLocaleString('en-IN')}</span>
            </div>
            {invoice.advancePaid > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: 700 }}>
                <span>(-) Advance Received</span>
                <span>-₹{invoice.advancePaid.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, color: '#DC2626', borderTop: '1.5px solid var(--border-medium)', paddingTop: '8px', marginTop: '4px' }}>
              <span>Net Balance Due</span>
              <span>₹{invoice.balanceDue.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Dynamic UPI QR Code Section */}
          {invoice.balanceDue > 0 && (
            <div style={{ background: 'linear-gradient(135deg, rgba(255,149,0,0.08) 0%, rgba(99,102,241,0.06) 100%)', border: '1.5px solid rgba(255,149,0,0.25)', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img 
                src={qrCodeUrl} 
                alt="UPI QR Code" 
                style={{ width: '84px', height: '84px', borderRadius: '8px', background: '#fff', padding: '4px', border: '1px solid #ddd' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase' }}>
                  Instant UPI Payment
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  Scan with GPay / PhonePe
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                  UPI: <strong>{customUpi}</strong>
                </div>
                <button
                  onClick={handleCopyLink}
                  style={{ marginTop: '6px', fontSize: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 700 }}
                >
                  {copied ? '✓ Link Copied!' : 'Copy UPI Link'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleWhatsAppShare}
            style={{
              flex: 1,
              height: '48px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(37, 211, 102, 0.3)',
            }}
          >
            <span>💬 Share on WhatsApp</span>
          </button>
          <button
            onClick={handlePrint}
            style={{
              height: '48px',
              padding: '0 18px',
              borderRadius: '14px',
              border: '1.5px solid var(--border-medium)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <span>🖨️ Print / PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
