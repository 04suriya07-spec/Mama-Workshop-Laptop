import type { Metadata } from 'next';
import '../styles/globals.css';
import ClientLayout from '@/components/layout/ClientLayout';

export const metadata: Metadata = {
  title: 'MEW — Mithra Engineering Works',
  description: 'Mithra Engineering Works (MEW) — Borewell Rig & Workshop Operating System',
  keywords: 'MEW, Mithra Engineering Works, borewell rig workshop, lathe turning, hydraulic hose, workshop management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MEW',
  },
  formatDetection: {
    telephone: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#FF6B35" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
