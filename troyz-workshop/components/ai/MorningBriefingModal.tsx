'use client';

import React, { useState, useEffect } from 'react';
import { getAllJobs, getAllCustomers, getAllParts, getAllSuppliers } from '@/lib/db';
import { formatCurrency } from '@/lib/currency';

interface MorningBriefingModalProps {
  onClose: () => void;
}

export default function MorningBriefingModal({ onClose }: MorningBriefingModalProps) {
  const [lang, setLang] = useState<'ta-IN' | 'en-IN'>('ta-IN');
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [briefingData, setBriefingData] = useState<{
    inBayCount: number;
    readyCount: number;
    totalReceivables: number;
    lowStockCount: number;
    supplierPayables: number;
    tamilScript: string;
    englishScript: string;
  } | null>(null);

  useEffect(() => {
    async function prepareBriefing() {
      try {
        const [jobs, customers, parts, suppliers] = await Promise.all([
          getAllJobs(),
          getAllCustomers(),
          getAllParts(),
          getAllSuppliers(),
        ]);

        const inBay = jobs.filter(j => j.status === 'active').length;
        const ready = jobs.filter(j => j.status === 'completed' || j.status === 'delivered').length;
        const receivables = jobs.reduce((sum, j) => sum + (j.balance || 0), 0);
        const lowStock = parts.filter(p => p.stock <= (p.minStock || 2)).length;
        const payables = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);

        // Tamil Natural Audio Briefing Script
        let ta = `வணக்கம்! இது உங்களின் இன்றைய காலை பணி அறிக்கை. `;
        ta += `இன்று பட்டறையில் ${inBay} ரிக் வண்டிகள் வேலை நடந்துகொண்டிருக்கின்றன. `;
        if (ready > 0) {
          ta += `${ready} வண்டிகள் டெலிவரிக்கு தயாராக உள்ளன. `;
        }
        if (receivables > 0) {
          ta += `வாடிக்கையாளர்களிடமிருந்து வசூலிக்க வேண்டிய நிலுவைத் தொகை ₹${receivables.toLocaleString('en-IN')}. `;
        }
        if (lowStock > 0) {
          ta += `${lowStock} உதிரிபாகங்கள் குறைவான இருப்பில் உள்ளன. `;
        }
        ta += `இனிய நாளாக அமைய வாழ்த்துகள்!`;

        // English Natural Audio Briefing Script
        let en = `Good morning! Here is your daily workshop executive briefing. `;
        en += `You have ${inBay} bore rigs currently in service in the bay. `;
        if (ready > 0) {
          en += `${ready} vehicles are ready for customer delivery. `;
        }
        if (receivables > 0) {
          en += `Total customer receivables pending collection is ₹${receivables.toLocaleString('en-IN')}. `;
        }
        if (lowStock > 0) {
          en += `${lowStock} spare parts need restocking. `;
        }
        en += `Have a productive and profitable day!`;

        setBriefingData({
          inBayCount: inBay,
          readyCount: ready,
          totalReceivables: receivables,
          lowStockCount: lowStock,
          supplierPayables: payables,
          tamilScript: ta,
          englishScript: en,
        });

        // Automatically start speaking in Tamil on open
        speakAudio(ta, 'ta-IN');
      } catch (e) {
        console.error('Error preparing briefing:', e);
      } finally {
        setLoading(false);
      }
    }

    prepareBriefing();

    return () => {
      stopAudio();
    };
  }, []);

  const speakAudio = (text: string, language: string) => {
    setIsPlaying(true);
    const native = (window as any).MewNative || (window as any).AndroidNativeVoice;
    if (native && native.speak) {
      native.speak(text, language);
      return;
    }

    // Fallback to Web Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopAudio = () => {
    setIsPlaying(false);
    const native = (window as any).MewNative || (window as any).AndroidNativeVoice;
    if (native && native.stopSpeaking) {
      native.stopSpeaking();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const toggleLanguage = (newLang: 'ta-IN' | 'en-IN') => {
    setLang(newLang);
    if (!briefingData) return;
    const script = newLang === 'ta-IN' ? briefingData.tamilScript : briefingData.englishScript;
    speakAudio(script, newLang);
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
          borderRadius: '26px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          background: 'var(--bg-card)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, #FF9500 0%, #FF5E00 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '22px', boxShadow: '0 6px 18px rgba(255, 149, 0, 0.35)' }}>
              🎙️
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                MEW Morning Audio Briefing
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                AI Voice Executive Summary • {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
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

        {/* Language Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '14px' }}>
          <button
            onClick={() => toggleLanguage('ta-IN')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              background: lang === 'ta-IN' ? 'var(--bg-card)' : 'transparent',
              color: lang === 'ta-IN' ? 'var(--text-brand)' : 'var(--text-muted)',
              boxShadow: lang === 'ta-IN' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            🇮🇳 தமிழ் Audio
          </button>
          <button
            onClick={() => toggleLanguage('en-IN')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              background: lang === 'en-IN' ? 'var(--bg-card)' : 'transparent',
              color: lang === 'en-IN' ? 'var(--text-brand)' : 'var(--text-muted)',
              boxShadow: lang === 'en-IN' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            🌐 English Audio
          </button>
        </div>

        {/* Animated Audio Equalizer Visualizer */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,149,0,0.12) 0%, rgba(99,102,241,0.1) 100%)',
          border: '1.5px solid rgba(255,149,0,0.3)',
          borderRadius: '20px',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          {/* Waveform Bars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '48px' }}>
            {[14, 28, 42, 20, 36, 48, 24, 38, 18, 44, 30, 16].map((h, i) => (
              <div
                key={i}
                style={{
                  width: '5px',
                  height: isPlaying ? `${Math.max(8, (h + (i % 3) * 6))}px` : '8px',
                  background: 'linear-gradient(180deg, #FF9500 0%, #FF5E00 100%)',
                  borderRadius: '10px',
                  transition: 'height 0.2s ease',
                  boxShadow: isPlaying ? '0 0 10px rgba(255,149,0,0.6)' : 'none',
                }}
              />
            ))}
          </div>

          {/* Audio Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => {
                if (isPlaying) {
                  stopAudio();
                } else if (briefingData) {
                  speakAudio(lang === 'ta-IN' ? briefingData.tamilScript : briefingData.englishScript, lang);
                }
              }}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: 'none',
                background: 'linear-gradient(135deg, #FF9500 0%, #FF5E00 100%)',
                color: '#fff',
                fontSize: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(255,149,0,0.4)',
              }}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button
              onClick={() => {
                if (briefingData) {
                  speakAudio(lang === 'ta-IN' ? briefingData.tamilScript : briefingData.englishScript, lang);
                }
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🔄 Replay Briefing
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        {briefingData && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: '#B45309', fontWeight: 800, textTransform: 'uppercase' }}>
                🚜 In Bay Services
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
                {briefingData.inBayCount} Rigs
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: '#047857', fontWeight: 800, textTransform: 'uppercase' }}>
                💰 Pending To Collect
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#16A34A', marginTop: '2px' }}>
                ₹{briefingData.totalReceivables.toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: '#6D28D9', fontWeight: 800, textTransform: 'uppercase' }}>
                ⚠️ Low Stock Items
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
                {briefingData.lowStockCount} Parts
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: '#B91C1C', fontWeight: 800, textTransform: 'uppercase' }}>
                💳 Supplier Payables
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#DC2626', marginTop: '2px' }}>
                ₹{briefingData.supplierPayables.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        )}

        {/* Live Audio Transcript Box */}
        {briefingData && (
          <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              🎙️ Voice Transcript:
            </div>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary)', fontWeight: 600 }}>
              {lang === 'ta-IN' ? briefingData.tamilScript : briefingData.englishScript}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
