'use client';

import VoiceEntry from '@/components/ai/VoiceEntry';

export default function VoicePage() {
  return (
    <div className="stagger-children">
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <h1 className="page-title">Voice Assistant</h1>
            <p className="page-subtitle">குரல் உதவியாளர் — Tap the mic to speak</p>
          </div>
        </div>
      </div>
      <VoiceEntry />
    </div>
  );
}
