import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/features/AppShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'AyuntamentIA',
    template: '%s · AyuntamentIA',
  },
  description:
    "Plataforma d'intel·ligència política per al seguiment de plens municipals de Catalunya",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0d1117] text-[#e6edf3]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
