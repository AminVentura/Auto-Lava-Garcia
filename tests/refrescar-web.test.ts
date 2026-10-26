/** Botón «Refrescar web» del panel de Antojos y Firebase Hosting (2026-10-26). */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ value: { ok: true, email: 'angela@example.com' } as Record<string, unknown> }));
vi.mock('@/lib/admin-auth', () => ({ getAdminSession: async () => session.value }));

import * as web from '@/lib/refrescar-web';
import { GET, POST } from '@/app/api/admin/refrescar-web/route';
import { listaAdminsConfigurada } from '@/lib/admin-lista';

const ENV_KEYS = ['WEB_REFRESH_GITHUB_TOKEN', 'WEB_REFRESH_REPO', 'ADMIN_EMAILS'] as const;
const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;

type Call = { url: string; method: string; body?: string };

function fakeGithub(runs: unknown[] = [], dispatchStatus = 204, jobs: unknown[] = []) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body as string | undefined });
    if (String(url).includes('/dispatches')) return new Response(null, { status: dispatchStatus });
    if (String(url).includes('/jobs')) return Response.json({ jobs });
    return Response.json({ workflow_runs: runs });
  }) as typeof fetch;
  return calls;
}

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.WEB_REFRESH_GITHUB_TOKEN = 'token-de-prueba';
  delete process.env.WEB_REFRESH_REPO;
  process.env.ADMIN_EMAILS = 'angela@example.com';
  session.value = { ok: true, email: 'angela@example.com' };
  web.reiniciarLimite();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  globalThis.fetch = realFetch;
});

describe('permiso', () => {
  it('sin sesión de admin: 401 y no llama a GitHub', async () => {
    session.value = { ok: false, status: 401, message: 'Debe iniciar sesión.' };
    const calls = fakeGithub();
    expect((await POST()).status).toBe(401);
    expect((await GET()).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('usuario fuera de la lista: 403', async () => {
    session.value = { ok: false, status: 403, message: 'Este usuario no está autorizado para administrar.' };
    fakeGithub();
    expect((await POST()).status).toBe(403);
  });

  it('ADMIN_EMAILS vacío: nadie publica (no vale cualquier cuenta de Clerk)', async () => {
    delete process.env.ADMIN_EMAILS;
    const calls = fakeGithub();
    expect(listaAdminsConfigurada()).toBe(false);
    expect((await POST()).status).toBe(403);
    expect(calls).toHaveLength(0);
  });
});

describe('publicar y límite', () => {
  it('lanza workflow_dispatch del repo Auto-Lava-Garcia y devuelve 202 en cola', async () => {
    const calls = fakeGithub([]);
    const res = await POST();
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.estado).toBe('en_cola');
    expect(JSON.stringify(body)).not.toContain('token-de-prueba');
    const d = calls.find((c) => c.url.includes('/dispatches'));
    expect(d?.url).toBe('https://api.github.com/repos/AminVentura/Auto-Lava-Garcia/actions/workflows/firebase-hosting.yml/dispatches');
    expect(JSON.parse(d?.body || '{}')).toEqual({ ref: 'main', inputs: { motivo: 'boton-admin-antojos' } });
  });

  it('segundo clic enseguida: 429 con Retry-After', async () => {
    fakeGithub([]);
    expect((await POST()).status).toBe(202);
    const again = await POST();
    expect(again.status).toBe(429);
    expect(Number(again.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('sin token: 503 apagado', async () => {
    delete process.env.WEB_REFRESH_GITHUB_TOKEN;
    const calls = fakeGithub();
    const res = await POST();
    expect(res.status).toBe(503);
    expect((await res.json()).estado).toBe('apagado');
    expect(calls).toHaveLength(0);
  });
});

describe('estado', () => {
  const run = { id: 9, status: 'in_progress', conclusion: null, html_url: 'https://github.com/x/runs/9', created_at: '2026-10-26T10:00:00Z', updated_at: '2026-10-26T10:00:30Z', event: 'workflow_dispatch' };

  it('publicando, listo y apagado', async () => {
    fakeGithub([run]);
    expect((await (await GET()).json()).estado).toBe('publicando');
    fakeGithub([{ ...run, status: 'completed', conclusion: 'success' }], 204, [{ name: 'publicar', conclusion: 'success' }]);
    expect((await (await GET()).json()).estado).toBe('listo');
    fakeGithub([{ ...run, status: 'completed', conclusion: 'success' }], 204, [{ name: 'aviso', conclusion: 'success' }, { name: 'publicar', conclusion: 'skipped' }]);
    expect((await (await GET()).json()).estado).toBe('apagado');
  });
});

describe('Firebase Hosting', () => {
  const wf = readFileSync(new URL('../.github/workflows/firebase-hosting.yml', import.meta.url), 'utf8');
  const fb = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'));

  it('workflow: push a main y workflow_dispatch, apagado sin FIREBASE_DEPLOY_ENABLED', () => {
    expect(wf).toMatch(/workflow_dispatch:/);
    expect(wf).toMatch(/branches: \[main\]/);
    expect(wf).toMatch(/if: vars\.FIREBASE_DEPLOY_ENABLED != 'true'/);
    expect(wf).toMatch(/^ {2}publicar:/m);
    expect(wf).toMatch(/--only hosting:portal --project antojos-kds/);
    expect(wf).toMatch(/npm run sync:data/);
  });

  it('firebase.json conserva redirecciones y cabeceras de Vercel; hay 404 propia', () => {
    const r = Object.fromEntries(fb.hosting.redirects.map((x: { source: string; destination: string }) => [x.source, x.destination]));
    expect(r['/faq.html']).toBe('/preguntas-frecuentes.html');
    expect(r['/admin']).toBe('https://admin.antojosbarlounge.com/admin');
    expect(fb.hosting.cleanUrls).toBeUndefined();
    const sources = fb.hosting.headers.map((h: { source: string }) => h.source);
    expect(sources).toEqual(expect.arrayContaining(['/data/*.json', '/ads.txt', '/sitemap.xml']));
    expect(readFileSync(new URL('../public/404.html', import.meta.url), 'utf8')).toMatch(/noindex/);
  });

  it('el panel usa el botón nuevo y no el Deploy Hook de Vercel', () => {
    const dash = readFileSync(new URL('../app/admin/AdminDashboard.tsx', import.meta.url), 'utf8');
    expect(dash).toMatch(/\/api\/admin\/refrescar-web/);
    expect(dash).toMatch(/Refrescar web/);
    expect(dash).not.toMatch(/process.env.WEB_REFRESH/);
  });
});
