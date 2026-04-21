import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/features/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'AjuntamentIA — War Room',
    template: '%s · AjuntamentIA',
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
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=DM+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#0E1117] text-[#C8D6E5]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
