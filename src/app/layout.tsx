import type { Metadata, Viewport } from 'next';
import '../index.css';

export const metadata: Metadata = {
  title: 'ASABEA FIT — Progressive Fitness & Weight Tracker',
  description: 'A mobile-first fitness PWA for Asabea tracking walks, jogs, hydration, and healthy lifestyle milestones. Small Steps. Big Results.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  themeColor: '#E96A8D',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ASABEA FIT',
  },
};

export const viewport: Viewport = {
  themeColor: '#E96A8D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-[#FAF9F6] text-[#252525] antialiased">
        {children}
      </body>
    </html>
  );
}
