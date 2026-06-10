import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Auto Lava Garcia & Antojos Bar Lounge',
  description: 'Lavadero, cafetería y ofertas de Antojos Bar Lounge en Santiago de los Caballeros.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es-DO">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
