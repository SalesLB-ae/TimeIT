import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TimeIT — LeadersBrands Time Tracker',
  description: 'The official LeadersBrands time tracker. Track time with one click.',
  icons: { icon: '/icons/logo-clock.svg', apple: '/icons/logo-clock-256.png' },
};

export const viewport: Viewport = {
  themeColor: '#8ec9ff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
