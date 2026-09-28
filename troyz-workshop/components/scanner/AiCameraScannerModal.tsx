'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { savePart, getSetting } from '@/lib/db';
import { callGeminiVision, resolveGeminiKey } from '@/lib/gemini';

interface AiCameraScannerModalProps {
  initialMode?: 'plate' | 'bill';
  onClose: () => void;
  onPlateScanned?: (regNo: string) => void;
  onBillScanned?: (billData: any) => void;
}

export default function AiCameraScannerModal({
  initialMode = 'plate',
  onClose,
  onPlateScanned,
  onBillScanned,
}: AiCameraScannerModalProps) {
  const router = useRouter();
  const [scanMode, setScanMode] = useState<'plate' | 'bill'>(initialMode);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    setError(null);
    setExtractedData(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = '';
  };

  const handleScanImage = async () => {
    if (!imagePreview) return;
    setScanning(true);
    setError(null);

    try {
      const apiKey = await resolveGeminiKey(getSetting);
      if (!apiKey) {
        throw new Error('Gemini API key is not configured. Please add your key in Settings.');
      }

      const prompt = scanMode === 'plate'
        ? `Analyze this image carefully. This is a picture of a vehicle, truck, or bore rig registration number plate in India.
Extract:
1. "registrationNumber": The clean vehicle license plate number without spaces (e.g. TN28AB1234, KA01CD5678, AP09EF9999).
2. "vehicleModel": If visible, any make or model name (e.g., Ashok Leyland, Tata Signa, Eicher Pro, BharatBenz, Swaraj).
3. "confidence": "high" | "medium" | "low".

Return ONLY a valid raw JSON object with this exact structure:
{"registrationNumber": "TN28AB1234", "vehicleModel": "Ashok Leyland 2518", "confidence": "high"}`
        : `Analyze this image carefully. This is an invoice, cash bill, or receipt for workshop spare parts, hydraulic hoses, lathe jobs, or welding.
Extract:
1. "supplierName": Name of the spare parts store / vendor / workshop.
2. "invoiceNumber": Bill/Invoice number if visible.
3. "date": Date in YYYY-MM-DD or as written.
4. "totalAmount": Grand total amount as number.
5. "items": Array of items, each with:
   - "name": Description/name of part or service.
   - "qty": Quantity as number (default 1).
   - "unitPrice": Rate/price per unit as number.
   - "total": Line total as number.

Return ONLY a valid raw JSON object matching this structure:
{
  "supplierName": "Store Name",
  "invoiceNumber": "INV-1234",
  "date": "2026-08-22",
  "totalAmount": 4500,
  "items": [
    {"name": "Hydraulic Hose 1/2 inch", "qty": 2, "unitPrice": 1200, "total": 2400}
  ]
}`;

      // Call Gemini Vision directly (works in both standalone Android APK & web)
      let rawResult = await callGeminiVision({
        imageBase64: imagePreview,
        prompt,
        apiKey,
        responseMimeType: 'application/json',
      });

      if (!rawResult) {
        // Fallback to server route if available
        try {
          const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: scanMode === 'plate' ? 'ocr_plate' : 'ocr_bill',
              imageBase64: imagePreview,
            }),
          });
          const text = await res.text();
          if (text.startsWith('<')) {
            throw new Error('API route unavailable on device.');
          }
          const data = JSON.parse(text);
          rawResult = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
        } catch {
          // ignore fallback error if vision call also failed
        }
      }

      if (!rawResult) {
        throw new Error('AI could not read the image. Please ensure good lighting and text is clearly readable.');
      }

      let parsed: any = null;
      try {
        parsed = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
      } catch {
        const match = (rawResult as string).match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      if (!parsed) {
        throw new Error('AI was unable to parse structured information from this image.');
      }

      setExtractedData(parsed);

      if (scanMode === 'plate' && parsed.registrationNumber) {
        onPlateScanned?.(parsed.registrationNumber);
      }
      if (scanMode === 'bill') {
        onBillScanned?.(parsed);
      }
    } catch (err: any) {
      setError(err.message || 'Scan failed. Please try a clearer photo or check your API key.');
    } finally {
      setScanning(false);
    }
  };

  const handleImportBillToStock = async () => {
    if (!extractedData || !extractedData.items) return;
    try {
      for (const item of extractedData.items) {
        await savePart({
          name: item.name || 'Spare Part',
          sku: `OCR-${Math.floor(1000 + Math.random() * 9000)}`,
          category: 'other',
          unit: 'pcs',
          purchasePrice: Number(item.unitPrice) || 0,
          sellingPrice: Math.round((Number(item.unitPrice) || 0) * 1.15),
          stock: Number(item.qty) || 1,
          minStock: 2,
          location: 'Main Bay',
        });
      }
      alert('✓ Bill items successfully imported to Parts Stock!');
      onClose();
      router.push('/stock');
    } catch (e: any) {
      alert('Import error: ' + e.message);
    }
  };

  const resetCapture = () => {
    setImagePreview(null);
    setExtractedData(null);
    setError(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div 
        className="modal-sheet" 
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          background: 'var(--bg-card)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)' }}>
              📸
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                MEW AI Vision Scanner
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Instant Number Plate & Invoice OCR
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

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '14px' }}>
          <button
            onClick={() => { setScanMode('plate'); resetCapture(); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              background: scanMode === 'plate' ? 'var(--bg-card)' : 'transparent',
              color: scanMode === 'plate' ? 'var(--text-brand)' : 'var(--text-muted)',
              boxShadow: scanMode === 'plate' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>🚘 Number Plate</span>
          </button>
          <button
            onClick={() => { setScanMode('bill'); resetCapture(); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              background: scanMode === 'bill' ? 'var(--bg-card)' : 'transparent',
              color: scanMode === 'bill' ? 'var(--text-brand)' : 'var(--text-muted)',
              boxShadow: scanMode === 'bill' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>🧾 Spare Parts Bill</span>
          </button>
        </div>

        {/* Hidden Camera & Gallery File Inputs */}
        <input 
          ref={cameraInputRef}
          type="file" 
          accept="image/*" 
          capture="environment" 
          onChange={handleCapture}
          style={{ display: 'none' }}
        />
        <input 
          ref={galleryInputRef}
          type="file" 
          accept="image/*" 
          onChange={handleCapture}
          style={{ display: 'none' }}
        />

        {/* Viewfinder Rectangle Box (STRICTLY NON-CLICKABLE CONTAINER) */}
        <div
          style={{
            border: '2px dashed var(--border-medium)',
            borderRadius: '20px',
            padding: '20px',
            textAlign: 'center',
            background: 'var(--bg-elevated)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
          }}
        >
          {imagePreview ? (
            <div style={{ width: '100%', position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <img 
                src={imagePreview} 
                alt="Captured document" 
                style={{ maxHeight: '220px', maxWidth: '100%', objectFit: 'contain', borderRadius: '12px' }}
              />
              {scanning && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(5px)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  gap: '10px',
                }}>
                  <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                  <span style={{ fontSize: '14px', fontWeight: 800 }}>Gemini AI Reading Image...</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '36px' }}>📷</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {scanMode === 'plate' ? 'Bore Rig Number Plate Frame' : 'Spare Parts Invoice Frame'}
              </div>
              <div style={{ fontSize: '12px', maxWidth: '280px', lineHeight: 1.5 }}>
                Choose an option below to capture a new photo or select an existing image from your phone
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Located BELOW The Box */}
        {!imagePreview ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              style={{
                padding: '14px 16px',
                borderRadius: '16px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              }}
            >
              <span>📸 Take Photo</span>
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              style={{
                padding: '14px 16px',
                borderRadius: '16px',
                border: '1.5px solid var(--border-medium)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontWeight: 800,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <span>🖼️ Choose from Gallery</span>
            </button>
          </div>
        ) : !extractedData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              disabled={scanning}
              onClick={handleScanImage}
              style={{
                padding: '14px',
                borderRadius: '16px',
                border: 'none',
                background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: scanning ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(22, 163, 74, 0.35)',
                opacity: scanning ? 0.7 : 1,
              }}
            >
              <span>{scanning ? '⏳ Scanning Image...' : '🔍 Scan & Extract with AI'}</span>
            </button>

            <button
              type="button"
              onClick={resetCapture}
              disabled={scanning}
              style={{
                padding: '10px',
                borderRadius: '12px',
                border: '1px solid var(--border-medium)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🔄 Retake / Choose Different Photo
            </button>
          </div>
        ) : null}

        {/* Error Notification */}
        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid #DC2626', color: '#DC2626', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 700 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Extracted Data Result Card */}
        {extractedData && (
          <div style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border-medium)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ✓ AI Scan Result
              </span>
              <button
                onClick={resetCapture}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-brand)', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
              >
                🔄 Scan Another
              </button>
            </div>

            {scanMode === 'plate' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '14px', textAlign: 'center', border: '2px solid #6366F1' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>REGISTRATION NUMBER</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '2px', marginTop: '4px' }}>
                    {extractedData.registrationNumber || 'NOT DETECTED'}
                  </div>
                  {extractedData.vehicleModel && (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {extractedData.vehicleModel}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    onClose();
                    router.push(`/work/new?regNo=${encodeURIComponent(extractedData.registrationNumber || '')}`);
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                  }}
                >
                  <span>➕ Create Job Card with this Rig</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vendor / Supplier:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{extractedData.supplierName || 'Unknown Vendor'}</strong>
                </div>
                {extractedData.invoiceNumber && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Invoice No:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{extractedData.invoiceNumber}</strong>
                  </div>
                )}
                {extractedData.totalAmount && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Grand Total:</span>
                    <strong style={{ color: '#16A34A', fontSize: '15px' }}>₹{Number(extractedData.totalAmount).toLocaleString('en-IN')}</strong>
                  </div>
                )}

                {/* Parsed Items List */}
                {extractedData.items && extractedData.items.length > 0 && (
                  <div style={{ maxHeight: '160px', overflowY: 'auto', background: 'var(--bg-card)', borderRadius: '10px', padding: '8px' }}>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '6px' }}>Part</th>
                          <th style={{ padding: '6px', textAlign: 'center' }}>Qty</th>
                          <th style={{ padding: '6px', textAlign: 'right' }}>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedData.items.map((it: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '6px', fontWeight: 600 }}>{it.name}</td>
                            <td style={{ padding: '6px', textAlign: 'center' }}>{it.qty}</td>
                            <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>₹{it.unitPrice || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <button
                  onClick={handleImportBillToStock}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  }}
                >
                  <span>📥 Import All Items into Parts Stock</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
