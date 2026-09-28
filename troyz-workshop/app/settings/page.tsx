'use client';

import { useEffect, useRef, useState } from 'react';
import { getSetting, setSetting } from '@/lib/db';
import { validateGeminiKey } from '@/lib/gemini';
import { downloadBackup, shareBackup, importFromJSON, readFileAsText } from '@/lib/backup';
import { getUserProfile, UserProfile } from '@/lib/sync';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconBuildingStore = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconKey = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconShare = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <circle cx="18" cy="5" r="3"/>
    <circle cx="6" cy="12" r="3"/>
    <circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconMic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
    <path d="M19 10v2a7 7 0 01-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const IconDanger = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gst, setGst] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [orbEnabled, setOrbEnabled] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      getSetting('workshop_name'),
      getSetting('workshop_phone'),
      getSetting('workshop_address'),
      getSetting('workshop_gst'),
      getSetting('gemini_api_key'),
    ]).then(([n, p, a, g, k]) => {
      setName(n || 'Mithra Engineering Works (MEW)');
      setPhone(p || '+91 98451 23456');
      setAddress(a || 'No. 42, Main Road, Namakkal / Chennai');
      setGst(g || '33AAAAA0000A1Z5');
      setApiKey(k || '');
      setLoading(false);
    });

    import('firebase/auth').then(({ getAuth }) => {
      const auth = getAuth();
      if (auth.currentUser) {
        getUserProfile(auth.currentUser.uid).then(p => { if (p) setUserProfile(p); });
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    await setSetting('workshop_name', name);
    await setSetting('workshop_phone', phone);
    await setSetting('workshop_address', address);
    await setSetting('workshop_gst', gst);
    await setSetting('gemini_api_key', apiKey.trim());
    if (apiKey.trim() && typeof window !== 'undefined' && (window as any).AndroidNativeVoice) {
      (window as any).AndroidNativeVoice.syncApiKey(apiKey.trim());
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestKey = async () => {
    const key = apiKey.trim();
    if (!key) { setTestResult({ success: false, message: 'Please enter an API key first.' }); return; }
    setTestingKey(true);
    setTestResult(null);
    try {
      const result = await validateGeminiKey(key);
      if (result.valid) {
        setTestResult({ success: true, message: result.message });
        await setSetting('gemini_api_key', key);
      } else {
        setTestResult({ success: false, message: result.message });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: `Connection error: ${e.message || e}` });
    } finally {
      setTestingKey(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto' }} className="stagger">
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12, marginBottom: 8 }} />)}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 64 }} className="animate-fade-in">
      <h1 className="t-h2 mb-5">Settings</h1>

      {/* ── Workshop Profile ── */}
      <div className="settings-section">
        <div className="settings-section-label">Workshop Profile</div>
        <div className="settings-group">
          <div className="settings-row" style={{ cursor: 'default' }}>
            <div className="settings-icon" style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
              <IconBuildingStore />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="input-wrap">
                <label className="input-label">Workshop Name</label>
                <input className="input input-sm" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="input-wrap">
                <label className="input-label">Phone</label>
                <input className="input input-sm" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="input-wrap">
                <label className="input-label">GSTIN (optional)</label>
                <input className="input input-sm" style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontSize: 13 }} value={gst} onChange={e => setGst(e.target.value)} />
              </div>
              <div className="input-wrap">
                <label className="input-label">Address</label>
                <input className="input input-sm" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                style={{ marginTop: 4, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {saved ? <><IconCheck /> Saved!</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Assistant ── */}
      <div className="settings-section">
        <div className="settings-section-label">AI Voice Assistant</div>
        <div className="settings-group">
          <div className="settings-row" style={{ cursor: 'default' }}>
            <div className="settings-icon" style={{ background: 'var(--accent-dim)', color: 'var(--text-accent)' }}>
              <IconKey />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Google Gemini API Key</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  Powering Tamil/English voice AI. Free at{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>
                    aistudio.google.com/apikey
                  </a>
                </div>
              </div>
              <div className="input-wrap">
                <input
                  type="text"
                  className="input input-sm"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setTestResult(null); }}
                />
              </div>

              {testResult && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                  background: testResult.success ? 'var(--success-dim)' : 'var(--danger-dim)',
                  border: `1px solid ${testResult.success ? 'var(--success-bdr)' : 'var(--danger-bdr)'}`,
                  color: testResult.success ? 'var(--success)' : 'var(--danger)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {testResult.success ? <IconCheck /> : null}
                  {testResult.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={handleTestKey} disabled={testingKey || !apiKey.trim()}>
                  {testingKey ? 'Testing...' : 'Test Key'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!apiKey.trim()}>
                  {saved ? 'Saved!' : 'Save Key'}
                </button>
              </div>
            </div>
          </div>

          {typeof window !== 'undefined' && (window as any).AndroidNativeVoice && (
            <div className="settings-row" style={{ cursor: 'default' }}>
              <div className="settings-icon" style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                <IconMic />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Floating Voice Orb (மிதக்கும் குரல் பொட்டு)</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, marginBottom: 10 }}>
                  Background floating mic for quick voice commands from any screen.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <button className="btn btn-success btn-sm" onClick={() => {
                    const native = (window as any).AndroidNativeVoice;
                    if (native) {
                      native.requestOverlayPermission();
                      native.startOverlayService();
                      setOrbEnabled(true);
                    }
                  }}>
                    Enable Orb
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const native = (window as any).AndroidNativeVoice;
                    if (native) {
                      native.stopOverlayService();
                      setOrbEnabled(false);
                    }
                  }}>
                    Disable Orb
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    const native = (window as any).AndroidNativeVoice;
                    if (native && typeof native.openAppDetailsSettings === 'function') {
                      native.openAppDetailsSettings();
                    } else if (native) {
                      native.requestOverlayPermission();
                    }
                  }}>
                    ⚙️ App Settings
                  </button>
                </div>

                <div style={{
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: 'var(--text-muted)'
                }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>💡 If Android shows &ldquo;Access Denied&rdquo; / &ldquo;Restricted Setting&rdquo;:</strong><br/>
                  1. Tap <strong>App Settings</strong> above.<br/>
                  2. Tap the <strong>3 vertical dots (⋮)</strong> in the top-right corner of Android App Info.<br/>
                  3. Tap <strong>&ldquo;Allow restricted settings&rdquo;</strong> (unlock with PIN/Fingerprint).<br/>
                  4. Return and tap <strong>Enable Orb</strong>.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Backup & Restore ── */}
      <div className="settings-section">
        <div className="settings-section-label">Data Backup & Restore</div>
        <div className="settings-group">
          {backupStatus && (
            <div style={{
              margin: '0 16px 0',
              padding: '10px 14px',
              borderRadius: 10,
              background: backupStatus.startsWith('✅') ? 'var(--success-dim)' : 'var(--danger-dim)',
              border: `1px solid ${backupStatus.startsWith('✅') ? 'var(--success-bdr)' : 'var(--danger-bdr)'}`,
              color: backupStatus.startsWith('✅') ? 'var(--success)' : 'var(--danger)',
              fontSize: 12.5, fontWeight: 600,
              marginTop: 12,
            }}>
              {backupStatus}
            </div>
          )}

          <button
            className="settings-row"
            style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            disabled={backingUp}
            onClick={async () => {
              setBackingUp(true); setBackupStatus('');
              try { await downloadBackup(); setBackupStatus('✅ Backup downloaded!'); }
              catch (e: any) { setBackupStatus(`❌ ${e.message || 'Backup failed'}`); }
              finally { setBackingUp(false); }
            }}
          >
            <div className="settings-icon" style={{ background: 'var(--success-dim)', color: 'var(--success)' }}>
              <IconDownload />
            </div>
            <span className="settings-label">{backingUp ? 'Creating backup...' : 'Download Backup'}</span>
            <IconChevronRight />
          </button>

          <button
            className="settings-row"
            style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            disabled={backingUp}
            onClick={async () => {
              setBackingUp(true); setBackupStatus('');
              try { await shareBackup(); setBackupStatus('✅ Backup shared!'); }
              catch (e: any) { setBackupStatus(`❌ ${e.message || 'Share failed'}`); }
              finally { setBackingUp(false); }
            }}
          >
            <div className="settings-icon" style={{ background: 'var(--info-dim)', color: 'var(--info)' }}>
              <IconShare />
            </div>
            <span className="settings-label">Share Backup via WhatsApp</span>
            <IconChevronRight />
          </button>

          <input
            ref={restoreFileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setRestoring(true); setBackupStatus('');
              try {
                const text = await readFileAsText(file);
                const result = await importFromJSON(text);
                if (result.success) {
                  setBackupStatus(`✅ ${result.message}`);
                  setTimeout(() => window.location.reload(), 2000);
                } else {
                  setBackupStatus(`❌ ${result.message}`);
                }
              } catch (err: any) {
                setBackupStatus(`❌ ${err.message || 'Import failed'}`);
              } finally {
                setRestoring(false);
                e.target.value = '';
              }
            }}
          />

          <button
            className="settings-row"
            style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            disabled={restoring}
            onClick={() => restoreFileRef.current?.click()}
          >
            <div className="settings-icon" style={{ background: 'var(--warning-dim)', color: 'var(--warning)' }}>
              <IconUpload />
            </div>
            <span className="settings-label">{restoring ? 'Restoring...' : 'Restore from Backup File'}</span>
            <IconChevronRight />
          </button>
        </div>
      </div>

      {/* ── Account ── */}
      {userProfile && (
        <div className="settings-section">
          <div className="settings-section-label">Account</div>
          <div className="settings-group">
            <div className="settings-row" style={{ cursor: 'default' }}>
              {userProfile.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid var(--border-medium)', flexShrink: 0 }}
                />
              ) : (
                <div className="settings-icon" style={{ background: 'var(--brand-dim)', color: 'var(--brand)', width: 40, height: 40, borderRadius: '50%' }}>
                  <IconUser />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{userProfile.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{userProfile.email}</div>
              </div>
            </div>
            <button
              className="settings-row"
              style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onClick={async () => {
                if (confirm('Are you sure you want to log out?')) {
                  if ((window as any).__mewLogout) await (window as any).__mewLogout();
                }
              }}
            >
              <span className="settings-label" style={{ color: 'var(--danger)' }}>Log Out</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Danger Zone ── */}
      <div className="settings-section">
        <div className="settings-section-label">Danger Zone</div>
        <div className="settings-group" style={{ border: '1px solid var(--danger-bdr)' }}>
          <button
            className="settings-row"
            style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            onClick={async () => {
              if (confirm('Are you sure you want to CLEAR ALL DATA? This cannot be undone.')) {
                const { clearAllData } = await import('@/lib/db');
                await clearAllData(true);
                alert('All records cleared. Starting fresh.');
                window.location.href = '/';
              }
            }}
          >
            <div className="settings-icon" style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}>
              <IconDanger />
            </div>
            <span className="settings-label" style={{ color: 'var(--danger)' }}>Clear All Data & Start Fresh</span>
            <IconChevronRight />
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, padding: '0 4px' }}>
          Removes all customers, vehicles, jobs, attendance, stock and transactions. Cannot be undone.
        </div>
      </div>
    </div>
  );
}
