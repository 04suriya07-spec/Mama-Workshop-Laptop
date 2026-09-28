'use client';

import { useState, useRef, useEffect } from 'react';
import { askTroyz } from '@/lib/voice';

interface Message {
  id: string;
  type: 'user' | 'troyz';
  text: string;
  isMarkdown?: boolean;
}

const SUGGESTED = [
  'How much did we earn this month?',
  "Who hasn't paid yet?",
  'Which parts are low in stock?',
  'Show active jobs',
  "This month's summary",
  'Best customer?',
];

const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const IconSparkle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
  </svg>
);

export default function AskTroyz() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0', type: 'troyz',
      text: 'வணக்கம்! நான் MEW உதவியாளர். உங்கள் பட்டறை வரவு-செலவு, வாடிக்கையாளர், வண்டி விவரங்களை என்னிடம் கேட்கலாம்! 🔧',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 400);
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: `u_${Date.now()}`, type: 'user', text };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await askTroyz(text, 'en-IN');
      setMessages(m => [...m, { id: `b_${Date.now()}`, type: 'troyz', text: response, isMarkdown: true }]);
    } catch {
      setMessages(m => [...m, { id: `e_${Date.now()}`, type: 'troyz', text: 'Sorry, I ran into an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderText = (text: string) =>
    text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

  return (
    <>
      {/* Bottom sheet */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(4, 5, 12, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 798,
            }}
          />

          <div className="ask-sheet" style={{ zIndex: 799 }}>
            <div className="ask-sheet-handle" />

            {/* Header */}
            <div className="ask-sheet-header">
              <div className="ask-sheet-avatar">
                <IconSparkle />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  Ask MEW
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  Mithra Engineering AI
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label="Close chat"
              >
                <IconX />
              </button>
            </div>

            {/* Suggested pills (show before second message) */}
            {messages.length <= 1 && (
              <div className="pill-scroll">
                {SUGGESTED.map((q, i) => (
                  <button
                    key={i}
                    className="pill"
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="ask-sheet-messages">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`ask-message ${msg.type}`}
                  dangerouslySetInnerHTML={msg.isMarkdown ? { __html: renderText(msg.text) } : undefined}
                >
                  {!msg.isMarkdown ? msg.text : undefined}
                </div>
              ))}

              {isLoading && (
                <div className="ask-message troyz">
                  <div className="dot-loader">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="ask-sheet-input">
              <input
                ref={inputRef}
                className="input input-sm"
                style={{ flex: 1, fontSize: 14 }}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                placeholder="Ask anything about your workshop..."
              />
              <button
                className="btn btn-primary btn-icon"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
              >
                <IconSend />
              </button>
            </div>
          </div>
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        id="ask-troyz-btn"
        title="Ask MEW"
        aria-label="Ask MEW AI assistant"
        style={{
          position: 'fixed',
          bottom: 'calc(var(--bottom-nav-h) + 14px)',
          right: 16,
          width: 50, height: 50,
          borderRadius: '50%',
          background: isOpen
            ? 'linear-gradient(135deg, var(--accent), #6366F1)'
            : 'var(--bg-card)',
          border: `1.5px solid ${isOpen ? 'var(--accent)' : 'var(--border-medium)'}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isOpen ? 'white' : 'var(--text-secondary)',
          zIndex: 150,
          boxShadow: isOpen ? 'var(--accent-glow), var(--shadow-md)' : 'var(--shadow-md)',
          transition: 'all 0.25s var(--ease-spring)',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.92)')}
        onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isOpen ? <IconX /> : <IconChat />}
      </button>
    </>
  );
}
