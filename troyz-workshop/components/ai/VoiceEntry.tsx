'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getSetting } from '@/lib/db';
import {
  VoiceRecognition,
  speakTroyzResponse,
  stopTroyzSpeech,
  processLiveVoiceConversation,
  isBenignSpeechError,
  LiveChatMessage,
} from '@/lib/voice';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IconMic = ({ size = 28 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
    <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
    <path d="M19 10v2a7 7 0 01-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconStop = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ width: 24, height: 24 }}>
    <rect x="5" y="5" width="14" height="14" rx="2"/>
  </svg>
);

const IconSparkle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function VoiceEntry() {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [history, setHistory] = useState<LiveChatMessage[]>([]);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'ta-IN' | 'en-IN'>('ta-IN');

  // Refs for values needed inside callbacks without stale closures
  const isOpenRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const langRef = useRef<'ta-IN' | 'en-IN'>('ta-IN');
  const historyRef = useRef<LiveChatMessage[]>([]);
  const transcriptRef = useRef('');
  const processingSpokenRef = useRef(false);
  const listenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const recognizerRef = useRef<VoiceRecognition | null>(null);
  const handleUserSpokenInputRef = useRef<(text: string) => void>(() => {});
  const autoRestartCountRef = useRef(0);

  const isListening = phase === 'listening';
  const isThinking = phase === 'thinking';
  const isSpeaking = phase === 'speaking';

  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [history, transcript, phase]);

  const clearListenTimer = useCallback(() => {
    if (listenTimerRef.current) {
      clearTimeout(listenTimerRef.current);
      listenTimerRef.current = null;
    }
  }, []);

  const setPhaseNow = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const startListening = useCallback((delayMs = 0) => {
    clearListenTimer();
    listenTimerRef.current = setTimeout(() => {
      if (!isOpenRef.current) return;
      setPhaseNow('listening');
      setError('');
      setTranscript('');
      autoRestartCountRef.current = 0;
      recognizerRef.current?.stop();
      setTimeout(() => {
        recognizerRef.current?.start(langRef.current);
      }, 150);
    }, delayMs);
  }, [clearListenTimer, setPhaseNow]);

  useEffect(() => {
    handleUserSpokenInputRef.current = handleUserSpokenInput;
  });

  function handleUserSpokenInput(spokenText: string) {
    if (!spokenText.trim()) return;
    if (processingSpokenRef.current) return;
    processingSpokenRef.current = true;
    recognizerRef.current?.stop();
    setTranscript('');
    const lower = spokenText.toLowerCase().trim();
    if (
      lower === 'stop' || lower === 'close' || lower === 'exit' || lower === 'bye' ||
      lower === 'podhum' || lower === 'vendaam' ||
      lower.includes('போதும்') || lower.includes('வேண்டாம்') || lower.includes('நிறுத்து')
    ) {
      const farewell = langRef.current === 'ta-IN'
        ? 'சரிங்க, மீண்டும் சந்திப்போம்!'
        : 'Alright, talk to you soon!';
      setPhaseNow('speaking');
      speakTroyzResponse(farewell, langRef.current, () => {
        processingSpokenRef.current = false;
        setIsOpen(false);
      });
      return;
    }
    setPhaseNow('thinking');
    processAndSpeak(spokenText);
  }

  async function processAndSpeak(spokenText: string) {
    let reply: string;
    try {
      const result = await processLiveVoiceConversation(
        spokenText,
        historyRef.current,
        langRef.current
      );
      setHistory(result.updatedHistory);
      reply = (result.speech || '').trim() || (langRef.current === 'ta-IN' ? 'சரிங்க.' : 'Okay.');
    } catch (e: any) {
      console.error('Voice processing error:', e);
      reply = langRef.current === 'ta-IN'
        ? 'மன்னிச்சுக்கோங்க, ஒரு பிழை வந்திடுச்சு. மறுபடியும் சொல்லுங்க.'
        : 'Sorry, something went wrong. Please try again.';
    }
    setPhaseNow('speaking');
    speakTroyzResponse(reply, langRef.current, () => {
      processingSpokenRef.current = false;
      if (isOpenRef.current) {
        startListening(600);
      }
    });
  }

  useEffect(() => {
    const recognizer = new VoiceRecognition(
      (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          autoRestartCountRef.current = 0;
          handleUserSpokenInputRef.current(text);
        }
      },
      (err) => {
        if (!isOpenRef.current) return;
        if (isBenignSpeechError(err)) {
          if (phaseRef.current === 'idle' && autoRestartCountRef.current < 10) {
            autoRestartCountRef.current += 1;
            startListening(600);
          }
          return;
        }
        setError(err);
        if (phaseRef.current !== 'thinking' && phaseRef.current !== 'speaking') {
          if (autoRestartCountRef.current < 5) {
            autoRestartCountRef.current += 1;
            startListening(1200);
          }
        }
      },
      () => {
        if (!isOpenRef.current) return;
        if (phaseRef.current === 'thinking' || phaseRef.current === 'speaking') return;
        if (phaseRef.current === 'listening' && autoRestartCountRef.current < 10) {
          autoRestartCountRef.current += 1;
          startListening(500);
        }
      },
    );
    recognizerRef.current = recognizer;
    return () => { recognizer.stop(); };
  }, [startListening]);

  const openVoiceModal = useCallback(() => {
    setIsOpen(true);
    setTranscript('');
    setError('');
    processingSpokenRef.current = false;
    autoRestartCountRef.current = 0;
    getSetting('gemini_api_key').then(key => {
      const nv = typeof window !== 'undefined' ? (window as any).AndroidNativeVoice : null;
      if (nv && key) nv.syncApiKey(key);
    }).catch(() => {});
    if (historyRef.current.length === 0) {
      const welcome = langRef.current === 'ta-IN'
        ? 'வணக்கம்! என்ன பதிவு செய்ய வேண்டும்? சொல்லுங்க.'
        : 'Hi! How can I help your workshop today?';
      const welcomeMsg: LiveChatMessage = {
        id: 'welcome_' + Date.now(),
        role: 'assistant',
        text: welcome,
        timestamp: Date.now(),
      };
      setHistory([welcomeMsg]);
      setPhaseNow('speaking');
      speakTroyzResponse(welcome, langRef.current, () => {
        startListening(400);
      });
    } else {
      startListening(200);
    }
  }, [startListening]);

  useEffect(() => {
    if (isOpen) return;
    clearListenTimer();
    try { recognizerRef.current?.stop(); } catch (_) {}
    stopTroyzSpeech();
    processingSpokenRef.current = false;
    autoRestartCountRef.current = 0;
  }, [isOpen, clearListenTimer]);

  useEffect(() => {
    const handler = () => openVoiceModal();
    window.addEventListener('mew_open_voice', handler);
    return () => window.removeEventListener('mew_open_voice', handler);
  }, [openVoiceModal]);

  const handleToggle = useCallback(() => {
    if (!isOpenRef.current) {
      openVoiceModal();
      return;
    }
    clearListenTimer();
    recognizerRef.current?.stop();
    stopTroyzSpeech();
    processingSpokenRef.current = false;
    setIsOpen(false);
  }, [openVoiceModal, clearListenTimer]);

  const handleOrbClick = useCallback(() => {
    autoRestartCountRef.current = 0;
    setError('');
    if (phaseRef.current === 'listening') {
      recognizerRef.current?.stop();
      setPhaseNow('idle');
    } else if (phaseRef.current === 'idle') {
      startListening(0);
    }
  }, [startListening]);

  // ── Phase-derived UI state ────────────────────────────────────────────────
  const phaseColor = {
    idle:      'var(--brand)',
    listening: '#EF4444',
    thinking:  'var(--accent)',
    speaking:  'var(--success)',
  }[phase];

  const phaseLabel = {
    idle:      'Tap to speak',
    listening: 'Listening...',
    thinking:  'Processing...',
    speaking:  'Speaking...',
  }[phase];

  const phaseSub = {
    idle:      'Tap the orb or start speaking',
    listening: 'Speak clearly — Tamil or English',
    thinking:  'Analyzing your request...',
    speaking:  'MEW is responding',
  }[phase];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleToggle}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(4, 5, 12, 0.88)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Voice Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 520,
          height: '90vh', maxHeight: 740,
          background: 'linear-gradient(180deg, #111424 0%, #09090F 100%)',
          borderRadius: '28px 28px 0 0',
          border: '1px solid var(--border-medium)',
          borderBottom: 'none',
          boxShadow: '0 -20px 80px rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'sheetSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px 10px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `linear-gradient(135deg, ${phaseColor}, ${phaseColor}bb)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
              boxShadow: `0 0 16px ${phaseColor}60`,
              transition: 'background 0.3s ease, box-shadow 0.3s ease',
            }}>
              <IconMic size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                MEW Voice Assistant
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                  background: 'var(--success-dim)', color: 'var(--success)',
                  border: '1px solid var(--success-bdr)',
                  letterSpacing: '0.05em',
                }}>
                  LIVE
                </span>
              </div>
              <div style={{
                fontSize: 11.5, color: isListening ? 'var(--brand)' : isThinking ? 'var(--text-accent)' : isSpeaking ? 'var(--success)' : 'var(--text-muted)',
                fontWeight: 600, marginTop: 1,
                transition: 'color 0.25s ease',
              }}>
                {phaseLabel}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Lang toggle */}
            <div className="voice-lang-toggle">
              <button
                type="button"
                className={`voice-lang-btn ${lang === 'ta-IN' ? 'active' : ''}`}
                onClick={() => setLang('ta-IN')}
              >
                தமிழ்
              </button>
              <button
                type="button"
                className={`voice-lang-btn ${lang === 'en-IN' ? 'active' : ''}`}
                onClick={() => setLang('en-IN')}
              >
                English
              </button>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={handleToggle}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Close voice assistant"
            >
              <IconX />
            </button>
          </div>
        </div>

        {/* Chat stream */}
        <div
          ref={chatScrollRef}
          className="voice-chat-scroll"
          style={{ padding: '12px 16px' }}
        >
          {history.map((msg) => (
            <div key={msg.id} className={`voice-msg ${msg.role === 'user' ? 'user' : 'troyz'}`}>
              <div className="voice-msg-bubble">
                {msg.text}
              </div>
              {msg.actionExecuted && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 6,
                  background: 'var(--success-dim)',
                  border: '1px solid var(--success-bdr)',
                  color: 'var(--success)',
                  fontSize: 10.5, fontWeight: 700,
                  marginTop: 4,
                  alignSelf: 'flex-start',
                }}>
                  <IconCheck />
                  {msg.actionExecuted}
                </div>
              )}
            </div>
          ))}

          {/* Live transcript */}
          {transcript && (
            <div className="voice-msg user">
              <div
                className="voice-msg-bubble"
                style={{
                  fontStyle: 'italic',
                  color: 'var(--text-brand)',
                  border: '1px dashed var(--brand-border)',
                  background: 'var(--brand-dim)',
                }}
              >
                "{transcript}..."
              </div>
            </div>
          )}

          {/* Thinking dots */}
          {isThinking && (
            <div className="voice-msg troyz">
              <div className="voice-msg-bubble" style={{ display: 'flex', alignItems: 'center' }}>
                <div className="dot-loader">
                  <span style={{ background: 'var(--text-accent)' }} />
                  <span style={{ background: 'var(--text-accent)' }} />
                  <span style={{ background: 'var(--text-accent)' }} />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '8px 12px', borderRadius: 10,
              background: 'var(--danger-dim)', border: '1px solid var(--danger-bdr)',
              color: 'var(--danger)', fontSize: 12, textAlign: 'center',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Bottom: Orb + controls */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '20px 20px 28px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          background: 'rgba(8, 9, 14, 0.8)',
        }}>
          {/* Waveform (listening only) */}
          {isListening && (
            <div className="voice-waveform" style={{ marginTop: 0, marginBottom: -4 }}>
              {[6,14,24,18,28,12,8].map((h, i) => (
                <div
                  key={i}
                  className="voice-wave-bar"
                  style={{ '--bar-h': `${h}px` } as any}
                />
              ))}
            </div>
          )}

          {/* Orb */}
          <div style={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Rings */}
            {(isListening || isSpeaking) && (
              <>
                <div className="voice-ring" style={{ borderColor: `${phaseColor}60` }} />
                <div className="voice-ring" style={{ borderColor: `${phaseColor}40`, animationDelay: '0.6s' }} />
              </>
            )}

            {/* Core orb button */}
            <button
              type="button"
              onClick={handleOrbClick}
              style={{
                position: 'relative', zIndex: 10,
                width: 70, height: 70, borderRadius: '50%',
                border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${phaseColor}, ${phaseColor}cc)`,
                color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 32px ${phaseColor}70, 0 8px 32px rgba(0,0,0,0.5)`,
                transition: 'background 0.3s ease, box-shadow 0.3s ease, transform 0.15s ease',
                WebkitTapHighlightColor: 'transparent',
                animation: isThinking ? 'orbPulse 1.2s ease-in-out infinite' : undefined,
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.93)')}
              onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              {isListening ? <IconStop /> : <IconMic size={26} />}
            </button>
          </div>

          {/* Phase label */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 13.5, fontWeight: 600,
              color: phaseColor,
              transition: 'color 0.25s ease',
              letterSpacing: '-0.01em',
            }}>
              {phaseLabel}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              {phaseSub}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
