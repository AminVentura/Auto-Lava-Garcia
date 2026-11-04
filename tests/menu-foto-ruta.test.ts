/** Ruta /api/admin/menu-foto: solo admin, permiso de la foto, bytes webp, límite y token fuera del navegador (2026-11-04). */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ value: { ok: true, email: 'angela@example.com' } as Record<string, unknown> }));
vi.mock('@/lib/admin-auth', () => ({ getAdminSession: async () => session.value }));

import { POST } from '@/app/api/admin/menu-foto/route';
import { FOTO_PLATO_LIMITE, reiniciarLimiteFotos } from '@/lib/menuFoto';

const TOKEN = 'tok-de-prueba-no-real';
const ENV_KEYS = ['ADMIN_EMAILS', 'ADMIN_GITHUB_TOKEN'] as const;
const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;

function webp(extra = 20): string {
  const bytes = Buffer.alloc(12 + extra);
  bytes.write('RIFF', 0, 'ascii');
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WEBP', 8, 'ascii');
  return `data:image/webp;base64,${bytes.toString('base64')}`;
}

type Call = { url: string; method: string; auth?: string; body?: string };
function fakeGithub(putStatus = 201) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const h = (init.headers || {}) as Record<string, string>;
    calls.push({ url: String(url), method: init.method || 'GET', auth: h.authorization, body: init.body as string | undefined });
    if ((init.method || 'GET') === 'GET') return new Response('{}', { status: 404 });
    return new Response('{}', { status: putStatus });
  }) as typeof fetch;
  return calls;
}

function req(body: unknown) {
  return new Request('https://admin.antojosbarlounge.com/api/admin/menu-foto', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.ADMIN_EMAILS = 'angela@example.com';
  process.env.ADMIN_GITHUB_TOKEN = TOKEN;
  session.value = { ok: true, email: 'angela@example.com' };
  reiniciarLimiteFotos();
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('POST /api/admin/menu-foto', () => {
  it('sin sesión de admin no sube nada', async () => {
    session.value = { ok: false, status: 401, message: 'Debe iniciar sesión.' };
    const calls = fakeGithub();
    const res = await POST(req({ id: 'mofongo', imagen: webp(), permisoFoto: true }));
    expect(res.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('sin ADMIN_EMAILS nadie sube (no basta cualquier cuenta de Clerk)', async () => {
    delete process.env.ADMIN_EMAILS;
    const calls = fakeGithub();
    const res = await POST(req({ id: 'mofongo', imagen: webp(), permisoFoto: true }));
    expect(res.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it('exige que el admin declare el permiso de uso de la foto', async () => {
    const calls = fakeGithub();
    const res = await POST(req({ id: 'mofongo', imagen: webp() }));
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('rechaza un PNG disfrazado de webp y un id con ruta', async () => {
    const calls = fakeGithub();
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0]).toString('base64');
    expect((await POST(req({ id: 'mofongo', imagen: `data:image/webp;base64,${png}`, permisoFoto: true }))).status).toBe(400);
    expect((await POST(req({ id: '../data/ofertas', imagen: webp(), permisoFoto: true }))).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('rechaza una foto de más de 350 KB', async () => {
    const calls = fakeGithub();
    const res = await POST(req({ id: 'mofongo', imagen: webp(360_000), permisoFoto: true }));
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('guarda solo en public/menu-fotos/<id>.webp y el token no sale en la respuesta', async () => {
    const calls = fakeGithub();
    const res = await POST(req({ id: 'mofongo', imagen: webp(), permisoFoto: true }));
    const texto = await res.text();
    expect(res.status).toBe(200);
    expect(JSON.parse(texto)).toEqual({ ok: true, foto: 'https://antojosbarlounge.com/menu-fotos/mofongo.webp' });
    expect(texto).not.toContain(TOKEN);
    const put = calls.find((c) => c.method === 'PUT');
    expect(put?.url).toMatch(/\/contents\/public\/menu-fotos\/mofongo\.webp$/);
    expect(put?.auth).toBe(`Bearer ${TOKEN}`);
    // Repositorio público: el commit no lleva el correo del admin.
    expect(put?.body).not.toContain('angela@example.com');
  });

  it(`corta después de ${FOTO_PLATO_LIMITE} fotos seguidas del mismo admin`, async () => {
    fakeGithub();
    for (let i = 0; i < FOTO_PLATO_LIMITE; i += 1) {
      expect((await POST(req({ id: 'mofongo', imagen: webp(), permisoFoto: true }))).status).toBe(200);
    }
    expect((await POST(req({ id: 'mofongo', imagen: webp(), permisoFoto: true }))).status).toBe(429);
  });
});

describe('el token de GitHub no llega al navegador', () => {
  it('ni el panel (cliente) ni el JS público leen ADMIN_GITHUB_TOKEN', () => {
    const panel = readFileSync('app/admin/AdminDashboard.tsx', 'utf8');
    const publico = readFileSync('public/js/main.js', 'utf8');
    expect(panel.startsWith("'use client'")).toBe(true);
    expect(panel).not.toMatch(/process\.env\.ADMIN_GITHUB_TOKEN/);
    expect(publico).not.toMatch(/ADMIN_GITHUB_TOKEN|api\.github\.com/);
  });
});
