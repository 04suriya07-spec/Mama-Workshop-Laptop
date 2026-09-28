'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 50);
    const t2 = setTimeout(() => setPhase('exit'), 3000);
    const t3 = setTimeout(() => onDone(), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #0a0d18 0%, #141829 40%, #1a1025 70%, #0a0d18 100%)',
        transition: 'opacity 0.6s ease',
        opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
        pointerEvents: phase === 'exit' ? 'none' : 'auto',
      }}
    >
      {/* Glow behind logo */}
      <div
        style={{
          position: 'absolute',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'splashGlow 2.5s ease-in-out infinite',
        }}
      />

      {/* Troyz Logo */}
      <div
        style={{
          position: 'relative',
          width: 160,
          height: 160,
          marginBottom: 24,
          animation: 'splashBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: 'drop-shadow(0 8px 30px rgba(255,107,53,0.4))',
        }}
      >
        <Image
          src="/troyz-logo.png"
          alt="Troyz Solutions"
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>

      {/* App name */}
      <h1
        style={{
          position: 'relative',
          fontSize: 30,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: -0.5,
          marginBottom: 4,
          animation: 'splashSlideUp 0.6s ease 0.3s both',
        }}
      >
        MEW OS
      </h1>

      {/* Subtitle */}
      <p
        style={{
          position: 'relative',
          fontSize: 12,
          color: 'rgba(255,255,255,0.45)',
          fontWeight: 600,
          letterSpacing: 2.5,
          textTransform: 'uppercase',
          marginBottom: 32,
          animation: 'splashSlideUp 0.6s ease 0.5s both',
        }}
      >
        Mithra Engineering Works
      </p>

      {/* Divider */}
      <div
        style={{
          position: 'relative',
          width: 50,
          height: 2,
          borderRadius: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,107,53,0.5), transparent)',
          marginBottom: 20,
          animation: 'splashSlideUp 0.6s ease 0.7s both',
        }}
      />

      {/* Provider */}
      <p
        style={{
          position: 'relative',
          fontSize: 13,
          color: 'rgba(255,255,255,0.35)',
          fontWeight: 600,
          animation: 'splashSlideUp 0.6s ease 0.9s both',
        }}
      >
        Provided by{' '}
        <span
          style={{
            color: '#FF6B35',
            fontWeight: 800,
          }}
        >
          Troyz Solutions
        </span>
      </p>

      {/* Loading dots */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          gap: 8,
          marginTop: 48,
          animation: 'splashSlideUp 0.6s ease 1.1s both',
        }}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#FF6B35',
              animation: `splashDot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes splashGlow {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
        @keyframes splashBounce {
          0% { transform: scale(0.2) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.08) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes splashSlideUp {
          0% { transform: translateY(16px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes splashDot {
          0%, 80%, 100% { transform: scale(0.5); opacity: 0.2; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
