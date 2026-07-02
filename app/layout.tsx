import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TimeIT — LeadersBrands Time Tracker',
  description: 'The official LeadersBrands time tracker. Track time with one click.',
  icons: { icon: '/icons/logo-clock.svg', apple: '/icons/logo-clock-256.png' },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
