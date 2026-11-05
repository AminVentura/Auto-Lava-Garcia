import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getAdminSession } from '@/lib/admin-auth';
import AdminDashboard from './AdminDashboard';
import type { JsonDoc, MenuItem, Offer, ServiceItem } from './AdminDashboard';

async function readJson<T>(relativePath: string): Promise<T> {
  const raw = await readFile(path.join(process.cwd(), relativePath), 'utf8');
  return JSON.parse(raw) as T;
}

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session.ok) {
    if (session.status === 401) redirect('/sign-in');
    // Cuenta de Clerk válida pero fuera de ADMIN_EMAILS (o lista vacía): no se muestra nada del panel.
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <h1>Acceso no autorizado</h1>
          <p>{session.message}</p>
          <UserButton />
        </div>
      </main>
    );
  }

  const [offersDoc, washDoc, menuDoc] = await Promise.all([
    readJson<JsonDoc<{ ofertas: Offer[] }>>('data/ofertas.json'),
    readJson<JsonDoc<{ servicios: ServiceItem[] }>>('data/lavado_precios.json'),
    readJson<JsonDoc<{ articulos: MenuItem[] }>>('data/menu_restaurante.json'),
  ]);

  return (
    <>
      <link rel="stylesheet" href="/css/admin-static.css" />
      <main className="admin-shell">
        <header className="admin-hero">
          <div>
            <p className="eyebrow">Administración Antojos</p>
            <h1>Ofertas, menú y precios</h1>
            <p>Actualiza ofertas, precios de lavado y artículos del restaurante. El sistema guarda y publica automático.</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <a className="ghost-link" href="/" target="_blank" rel="noopener">Ver página pública</a>
            <a className="ghost-link" href="/qr/" target="_blank" rel="noopener">QR para imprimir</a>
            <UserButton />
          </div>
        </header>

        <AdminDashboard offersDoc={offersDoc} washDoc={washDoc} menuDoc={menuDoc} />
      </main>
    </>
  );
}
