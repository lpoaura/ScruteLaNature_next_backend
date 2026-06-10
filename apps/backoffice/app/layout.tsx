import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/src/components/layout/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: 'LPO Balades — Backoffice',
    template: '%s | LPO Balades',
  },
  description: 'Interface d\'administration des parcours de découverte LPO',
  robots: 'noindex, nofollow', // Backoffice = pas d'indexation
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
