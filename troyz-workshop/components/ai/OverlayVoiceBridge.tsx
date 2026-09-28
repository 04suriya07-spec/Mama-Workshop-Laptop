'use client';

import { useEffect, useRef } from 'react';
import { processLiveVoiceConversation, LiveChatMessage } from '@/lib/voice';

export default function OverlayVoiceBridge() {
  const historyRef = useRef<LiveChatMessage[]>([]);

  useEffect(() => {
    const native = (window as any).AndroidNativeVoice;
    if (!native) return;

    (window as any)._onOverlayVoiceQuery = async (text: string, lang: string) => {
      const spoken = (text || '').trim();
      if (!spoken) {
        native.onOverlayVoiceReply && native.onOverlayVoiceReply('சொல்லுங்க.', lang || 'ta-IN');
        return;
      }

      try {
        const result = await processLiveVoiceConversation(
          spoken,
          historyRef.current,
          (lang === 'en-IN' ? 'en-IN' : 'ta-IN')
        );
        historyRef.current = result.updatedHistory;
        native.onOverlayVoiceReply && native.onOverlayVoiceReply(result.speech || '', lang || 'ta-IN');
      } catch {
        const fallback = lang === 'en-IN'
          ? 'Sorry, something went wrong. Please try again.'
          : 'மன்னிச்சுக்கோங்க, ஒரு பிழை வந்திடுச்சு. மறுபடியும் சொல்லுங்க.';
        native.onOverlayVoiceReply && native.onOverlayVoiceReply(fallback, lang || 'ta-IN');
      }
    };

    return () => {
      delete (window as any)._onOverlayVoiceQuery;
    };
  }, []);

  return null;
}
