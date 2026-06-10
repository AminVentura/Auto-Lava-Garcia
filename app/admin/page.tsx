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
    redirect('/sign-in');
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
