import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/features/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'AyuntamentIA — War Room',
    template: '%s · AyuntamentIA',
  },
  description:
    "Intel·ligència política en temps real — 947 municipis de Catalunya",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&family=Inter+Tight:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#0d1117] text-[#e6edf3]" style={{ fontFamily: "'Inter Tight', system-ui, sans-serif" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
