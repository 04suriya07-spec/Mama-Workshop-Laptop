'use client';

import { useState } from 'react';
import AppShell from './AppShell';
import OnboardingGate from './OnboardingGate';
import SplashScreen from './SplashScreen';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <OnboardingGate>
        <AppShell>{children}</AppShell>
      </OnboardingGate>
    </>
  );
}
