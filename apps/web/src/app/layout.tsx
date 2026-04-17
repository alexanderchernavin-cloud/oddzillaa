import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import '../styles/globals.css';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = {
  title: 'Oddzilla — Esports Sportsbook',
  description: 'Live esports betting with real-time odds. CS2, Dota 2, LoL, Valorant and more.',
  openGraph: {
    title: 'Oddzilla — Esports Sportsbook',
    description: 'Live esports betting with real-time odds.',
    siteName: 'Oddzilla',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Oddzilla — Esports Sportsbook',
    description: 'Live esports betting with real-time odds.',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
