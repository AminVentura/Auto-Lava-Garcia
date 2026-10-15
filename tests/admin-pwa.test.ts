/**
 * PWA del panel /admin (2026-10-15). El service worker (admin-sw.js) se ejecuta en un contexto aislado con
 * `self`, `caches` y `fetch` simulados. Regla: nunca guarda /api/*, la página /admin, datos RSC ni nada
 * de Clerk; sin red, el panel muestra /admin-offline.html; la web pública no se toca.
 * También se comprueba el manifiesto (alcance /admin) y que la web pública no lo enlaza.
 */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
/* eslint-disable @typescript-eslint/no-explicit-any */
const HOST = 'admin.antojosbarlounge.com';

function cargarSW(opts: { red?: boolean } = {}) {
  const handlers: Record<string, (ev: any) => void> = {};
  const guardados: string[] = [];
  const store = new Map<string, Response>();
  const pedidosRed: string[] = [];
  const cache = {
    addAll: async (reqs: Request[]) => reqs.forEach((r) => store.set(new URL(r.url).pathname, new Response('x'))),
    put: async (req: Request) => void guardados.push(new URL(req.url).pathname),
  };
  const self = {
    location: { origin: `https://${HOST}`, hostname: HOST },
    addEventListener: (t: string, h: (ev: any) => void) => (handlers[t] = h),
    skipWaiting: () => undefined,
    clients: { claim: () => undefined },
  };
  const ctx = vm.createContext({
    self,
    URL,
    Request: class extends Request {
      constructor(u: string, init?: RequestInit) {
        super(new URL(u, `https://${HOST}`), init);
      }
    },
    Response,
    Promise,
    caches: {
      open: async () => cache,
      keys: async () => [],
      delete: async () => true,
      match: async (r: Request | string) => store.get(typeof r === 'string' ? r : new URL(r.url).pathname),
    },
    fetch: async (req: Request) => {
      pedidosRed.push(new URL(req.url).pathname);
      if (opts.red === false) throw new TypeError('Failed to fetch');
      return new Response('ok', { status: 200 });
    },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'public', 'admin-sw.js'), 'utf8'), ctx);
  return { handlers, guardados, store, pedidosRed };
}

async function pedir(sw: ReturnType<typeof cargarSW>, url: string, mode = 'cors', method = 'GET') {
  let respuesta: Promise<Response> | null = null;
  sw.handlers.fetch({ request: { url, mode, method }, respondWith: (p: Promise<Response>) => (respuesta = p) });
  return respuesta ? await respuesta : null;
}

const instalar = (sw: ReturnType<typeof cargarSW>) =>
  new Promise<void>((resolve) => sw.handlers.install({ waitUntil: (p: Promise<unknown>) => p.then(() => resolve()) }));

test('/api/* nunca pasa por el service worker (ni GET ni POST)', async () => {
  const sw = cargarSW();
  assert.equal(await pedir(sw, `https://${HOST}/api/admin/status`), null);
  assert.equal(await pedir(sw, `https://${HOST}/api/admin/save-json`, 'cors', 'POST'), null);
  assert.equal(await pedir(sw, `https://${HOST}/api/admin/social`, 'navigate'), null);
  assert.deepEqual(sw.guardados, []);
});

test('navegación a /admin: va a la red y no se guarda', async () => {
  const sw = cargarSW();
  assert.ok(await pedir(sw, `https://${HOST}/admin`, 'navigate'));
  assert.deepEqual(sw.pedidosRed, ['/admin']);
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(sw.guardados, []);
});

test('sin red: /admin muestra /admin-offline.html (aviso), nunca una copia del panel', async () => {
  const sw = cargarSW({ red: false });
  await instalar(sw);
  assert.equal(await pedir(sw, `https://${HOST}/admin`, 'navigate'), sw.store.get('/admin-offline.html'));
  assert.equal(await pedir(sw, `https://${HOST}/admin/algo`, 'navigate'), sw.store.get('/admin-offline.html'));
});

test('Clerk, /sign-in, web pública y datos RSC: el SW no interviene', async () => {
  const sw = cargarSW();
  assert.equal(await pedir(sw, `https://${HOST}/sign-in`, 'navigate'), null);
  assert.equal(await pedir(sw, `https://${HOST}/__clerk/v1/client`), null);
  assert.equal(await pedir(sw, `https://${HOST}/`, 'navigate'), null);
  assert.equal(await pedir(sw, `https://${HOST}/menu.html`, 'navigate'), null);
  assert.equal(await pedir(sw, `https://${HOST}/admin?_rsc=abc`), null);
  assert.equal(await pedir(sw, 'https://clerk.antojosbarlounge.com/v1/client'), null);
  assert.equal(await pedir(sw, 'https://api.github.com/repos/AminVentura/Auto-Lava-Garcia/contents/data/menu_restaurante.json'), null);
  assert.equal(await pedir(sw, `https://${HOST}/data/menu_restaurante.json`), null);
});

test('el cascarón solo lleva archivos estáticos', () => {
  const src = fs.readFileSync(path.join(root, 'public', 'admin-sw.js'), 'utf8');
  const i = src.indexOf('const CASCARON = [');
  const lista = src.slice(i, src.indexOf('];', i));
  for (const prohibido of ['/api', "'/admin'", "'/sign-in", '/data/', "'/'"]) {
    assert.ok(!lista.includes(prohibido), `el cascarón incluye ${prohibido}`);
  }
});

test('manifiesto: alcance y arranque en /admin, iconos 192/512 any y maskable que existen', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'public', 'admin.webmanifest'), 'utf8'));
  assert.equal(m.start_url, '/admin');
  assert.equal(m.scope, '/admin');
  assert.equal(m.display, 'standalone');
  assert.ok(m.short_name && m.short_name.length <= 13);
  for (const [size, purpose] of [['192x192', 'any'], ['512x512', 'any'], ['192x192', 'maskable'], ['512x512', 'maskable']]) {
    const icon = m.icons.find((x: { sizes: string; purpose: string }) => x.sizes === size && x.purpose === purpose);
    assert.ok(icon, `falta icono ${size} ${purpose}`);
    assert.ok(fs.existsSync(path.join(root, 'public', icon.src)), `no existe ${icon.src}`);
  }
  assert.ok(fs.existsSync(path.join(root, 'public', 'admin-pwa', 'apple-touch-icon.png')));
});

test('la web pública no enlaza el manifiesto ni registra el service worker del panel', () => {
  const publicos = fs.readdirSync(path.join(root, 'public')).filter((f) => f.endsWith('.html') && f !== 'admin-offline.html');
  assert.ok(publicos.length > 5);
  for (const f of publicos) {
    const html = fs.readFileSync(path.join(root, 'public', f), 'utf8');
    assert.ok(!html.includes('admin.webmanifest'), `${f} enlaza admin.webmanifest`);
    assert.ok(!html.includes('admin-sw.js'), `${f} registra admin-sw.js`);
  }
  const reg = fs.readFileSync(path.join(root, 'app', 'admin', 'PanelPwa.tsx'), 'utf8');
  assert.match(reg, /register\('\/admin-sw\.js', \{ scope: '\/admin' \}\)/);
});

test('el aviso sin conexión no va al sitemap', () => {
  assert.ok(fs.readFileSync(path.join(root, 'generate-sitemap.js'), 'utf8').includes("'admin-offline.html'"));
});
