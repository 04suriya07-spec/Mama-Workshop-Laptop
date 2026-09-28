'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { importFromJSON, readFileAsText } from '@/lib/backup';
import {
  onAuthChange,
  signInWithGoogleIdToken,
  signOutApp,
  getUserProfile,
  saveUserProfile,
  UserProfile,
  hasLocalData,
  syncAll,
} from '@/lib/sync';
import { WEB_CLIENT_ID } from '@/lib/firebase';

type AuthState = 'checking' | 'unauthenticated' | 'profile_setup' | 'migrating' | 'syncing' | 'ready';

const containerStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 99999,
  background: 'linear-gradient(160deg, #07090e 0%, #13111c 60%, #07090e 100%)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: 24, color: '#fff', overflow: 'auto',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)',
  color: '#fff', fontSize: 15, outline: 'none',
};

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [phone, setPhone] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [syncMsg, setSyncMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [restoreStatus, setRestoreStatus] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [view, setView] = useState<'login' | 'restore' | 'profile' | 'migrate'>('login');
  const fileRef = useRef<HTMLInputElement>(null);

  const processAuthenticatedUser = useCallback(async (firebaseUser: User) => {
    setUser(firebaseUser);
    setDisplayName(firebaseUser.displayName || '');
    setEmail(firebaseUser.email || '');
    setPhotoURL(firebaseUser.photoURL || '');

    try {
      const existingProfile = await getUserProfile(firebaseUser.uid);
      if (existingProfile) {
        setAuthState('syncing');
        setSyncMsg('Syncing your data...');
        try {
          await syncAll(firebaseUser.uid, (msg) => setSyncMsg(msg));
        } catch (syncErr) {
          console.warn('Sync warning:', syncErr);
        }
        setAuthState('ready');
      } else {
        setView('profile');
        setAuthState('profile_setup');
      }
    } catch {
      setAuthState('ready');
    }
  }, []);

  useEffect(() => {
    // Check if user previously chose offline guest session
    const isGuest = typeof window !== 'undefined' && localStorage.getItem('mew_guest_session') === 'true';

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (!firebaseUser) {
        if (isGuest) {
          setAuthState('ready');
        } else {
          setAuthState('unauthenticated');
        }
        return;
      }

      await processAuthenticatedUser(firebaseUser);
    });

    const timeout = setTimeout(() => {
      setAuthState(prev => {
        if (prev === 'checking') {
          return isGuest ? 'ready' : 'unauthenticated';
        }
        return prev;
      });
    }, 4000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [processAuthenticatedUser]);

  const handleGoogleSignIn = useCallback(() => {
    setErrorMsg('');

    (window as any)._onGoogleSignIn = async (idToken: string) => {
      try {
        setAuthState('syncing');
        setSyncMsg('Connecting Google account...');
        const firebaseUser = await signInWithGoogleIdToken(idToken);
        localStorage.removeItem('mew_guest_session');
        await processAuthenticatedUser(firebaseUser);
      } catch (e: any) {
        console.error('Google sign in error:', e);
        setErrorMsg('Authentication error: ' + (e.message || e));
        setAuthState('unauthenticated');
      }
    };

    (window as any)._onGoogleDirectProfile = async (gEmail: string, gName: string, gPhoto: string) => {
      try {
        setAuthState('syncing');
        setSyncMsg('Signing in with Google...');
        setEmail(gEmail || '');
        setDisplayName(gName || gEmail?.split('@')[0] || 'Workshop Owner');
        setPhotoURL(gPhoto || '');
        localStorage.removeItem('mew_guest_session');
        localStorage.setItem('mew_google_user', JSON.stringify({ email: gEmail, name: gName, photo: gPhoto }));
        setAuthState('ready');
      } catch (e: any) {
        setErrorMsg('Sign in error: ' + (e.message || e));
        setAuthState('unauthenticated');
      }
    };

    (window as any)._onGoogleSignInError = (error: string) => {
      if (error !== 'cancelled') {
        setErrorMsg(error || 'Google Sign-In failed');
      }
      setAuthState('unauthenticated');
    };

    if (typeof (window as any).AndroidNativeVoice !== 'undefined') {
      const native = (window as any).AndroidNativeVoice;
      if (WEB_CLIENT_ID && native.startGoogleSignInWithClientId) {
        native.startGoogleSignInWithClientId(WEB_CLIENT_ID);
      } else {
        native.startGoogleSignIn();
      }
    } else {
      setErrorMsg('Google Sign-In is active in the Android app. You can also tap "Continue Offline" below.');
    }
  }, [processAuthenticatedUser]);

  const handleContinueAsGuest = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mew_guest_session', 'true');
    }
    setAuthState('ready');
  };

  const handleProfileComplete = async () => {
    if (!user || !displayName.trim()) return;
    setAuthState('migrating');
    setSyncMsg('Setting up your account...');

    try {
      const profileData: Omit<UserProfile, 'updatedAt'> = {
        uid: user.uid,
        name: displayName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        workshop: workshop.trim(),
        photoURL,
        createdAt: new Date().toISOString(),
      };
      await saveUserProfile(profileData);

      const localDataExists = await hasLocalData();
      if (localDataExists) {
        setAuthState('profile_setup');
        setView('migrate');
        return;
      }

      setAuthState('syncing');
      setSyncMsg('Welcome to MEW OS!');
      setAuthState('ready');
    } catch (e: any) {
      setErrorMsg('Failed to save profile: ' + (e.message || e));
      setAuthState('profile_setup');
    }
  };

  const handleMigrate = async (upload: boolean) => {
    if (!user) {
      setAuthState('ready');
      return;
    }
    setAuthState('syncing');
    if (upload) {
      setSyncMsg('Uploading your data to the cloud...');
      try {
        await syncAll(user.uid, (msg) => setSyncMsg(msg));
      } catch (err) {
        console.warn('Migration sync error:', err);
      }
    }
    setAuthState('ready');
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    setRestoreStatus('Reading backup...');
    try {
      const text = await readFileAsText(file);
      const result = await importFromJSON(text);
      if (result.success) {
        setRestoreStatus(result.message);
        setTimeout(() => {
          setView('login');
          setRestoreStatus('');
          setAuthState('ready');
        }, 1500);
      } else {
        setRestoreStatus(result.message);
      }
    } catch (err: any) {
      setRestoreStatus(err.message || 'Import failed');
    } finally {
      setRestoring(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mew_guest_session');
      }
      await signOutApp();
      setUser(null);
      setAuthState('unauthenticated');
      setView('login');
    } catch (e: any) {
      setErrorMsg('Logout failed: ' + (e.message || e));
    }
  };

  useEffect(() => {
    (window as any).__mewLogout = handleLogout;
    return () => { delete (window as any).__mewLogout; };
  });

  // ── Loading / Syncing states ──
  if (authState === 'checking' || authState === 'syncing' || authState === 'migrating') {
    const labels: Record<string, string> = {
      checking: 'Loading MEW OS...',
      syncing: syncMsg || 'Syncing workshop data...',
      migrating: syncMsg || 'Setting up...',
    };
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center' }}>
          <img src="/troyz-logo.png" alt="Troyz" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 20, filter: 'drop-shadow(0 0 20px rgba(249,115,22,0.4))' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginTop: 8 }}>{labels[authState]}</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <style jsx>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.6)}50%{opacity:1;transform:scale(1.2)}}`}</style>
          
          {authState === 'syncing' && (
            <button
              onClick={() => setAuthState('ready')}
              style={{
                marginTop: 24,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.6)',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Skip to Dashboard →
            </button>
          )}
        </div>
      </div>
    );
  }

  if (authState === 'ready') return <>{children}</>;

  // ═══════ LOGIN SCREEN ═══════
  if (authState === 'unauthenticated' && view === 'login') {
    return (
      <div style={containerStyle}>
        <img src="/troyz-logo.png" alt="Troyz Solutions" style={{ width: 88, height: 88, objectFit: 'contain', marginBottom: 20, filter: 'drop-shadow(0 8px 30px rgba(249,115,22,0.4))' }} />
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, letterSpacing: '-0.02em' }}>Mithra Engineering Works</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 28, letterSpacing: '0.02em' }}>Borewell Rig Workshop OS</p>

        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={handleGoogleSignIn} style={{
            width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none',
            background: '#fff', color: '#1a1a1a', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            boxShadow: '0 2px 14px rgba(0,0,0,0.4)',
          }}>
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Sign In with Google
          </button>

          <button
            onClick={handleContinueAsGuest}
            style={{
              width: '100%', padding: '12px 20px', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            ⚡ Continue Offline (Use App Directly)
          </button>
        </div>

        {errorMsg && (
          <div style={{ marginTop: 16, padding: '10px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12.5, fontWeight: 600, maxWidth: 320, textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <button onClick={() => setView('restore')} style={{ marginTop: 24, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
          Restore from backup file (.json)
        </button>
        <p style={{ position: 'absolute', bottom: 18, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Powered by Troyz Solutions</p>
      </div>
    );
  }

  // ═══════ RESTORE SCREEN ═══════
  if (view === 'restore') {
    return (
      <div style={containerStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Restore Backup</h2>
        <p style={{ fontSize: 13, opacity: 0.6, textAlign: 'center', maxWidth: 300, marginBottom: 24, lineHeight: 1.5 }}>
          Select a MEW backup file (.json) to restore your workshop data.
        </p>
        <input ref={fileRef} type="file" accept=".json" onChange={handleRestore} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} disabled={restoring}
          style={{ width: '100%', maxWidth: 300, padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
          {restoring ? 'Restoring...' : 'Choose Backup File'}
        </button>
        {restoreStatus && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22c55e', maxWidth: 300, textAlign: 'center' }}>
            {restoreStatus}
          </div>
        )}
        <button onClick={() => { setView('login'); setRestoreStatus(''); }} style={{ marginTop: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
          Back to Sign In
        </button>
      </div>
    );
  }

  // ═══════ PROFILE SETUP ═══════
  if (authState === 'profile_setup' && view === 'profile') {
    return (
      <div style={containerStyle}>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Complete Your Profile</h2>
        <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 24 }}>Just a couple more details to get started</p>

        {photoURL && <img src={photoURL} alt="" style={{ width: 60, height: 60, borderRadius: '50%', marginBottom: 16, border: '2px solid rgba(249,115,22,0.4)' }} />}

        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, display: 'block', marginBottom: 6 }}>Your Name *</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Balaji" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, display: 'block', marginBottom: 6 }}>Email</label>
            <input value={email} disabled style={{ ...inputStyle, opacity: 0.5 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, display: 'block', marginBottom: 6 }}>Phone Number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9845123456" type="tel" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, display: 'block', marginBottom: 6 }}>Workshop Name</label>
            <input value={workshop} onChange={e => setWorkshop(e.target.value)} placeholder="e.g. Mithra Engineering Works" style={inputStyle} />
          </div>

          {errorMsg && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}

          <button onClick={handleProfileComplete} disabled={!displayName.trim()}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: displayName.trim() ? 'linear-gradient(135deg, #F97316, #ea580c)' : 'rgba(255,255,255,0.1)',
              color: '#fff', fontSize: 16, fontWeight: 800, cursor: displayName.trim() ? 'pointer' : 'not-allowed',
              marginTop: 8, boxShadow: displayName.trim() ? '0 4px 20px rgba(249,115,22,0.4)' : 'none',
            }}>
            Continue to Workshop
          </button>
        </div>
      </div>
    );
  }

  // ═══════ MIGRATION CHOICE ═══════
  if (authState === 'profile_setup' && view === 'migrate') {
    return (
      <div style={containerStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Data Found on This Device</h2>
        <p style={{ fontSize: 13, opacity: 0.6, textAlign: 'center', maxWidth: 320, marginBottom: 24, lineHeight: 1.6 }}>
          We found existing workshop data on this device. Would you like to upload it to your cloud account so it&apos;s safe across devices?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
          <button onClick={() => handleMigrate(true)}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}>
            Yes, Upload to Cloud
          </button>
          <button onClick={() => handleMigrate(false)}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Skip for Now
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
