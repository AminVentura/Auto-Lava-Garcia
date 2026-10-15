import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import PanelPwa from './PanelPwa';

// PWA solo del panel (2026-10-15): la web pública no enlaza este manifiesto ni registra el service worker.
export const metadata: Metadata = {
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, title: 'Antojos Admin', statusBarStyle: 'black' },
  icons: { apple: '/admin-pwa/apple-touch-icon.png' },
};

export const viewport: Viewport = { themeColor: '#07171d' };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PanelPwa />
      {children}
    </>
  );
}
