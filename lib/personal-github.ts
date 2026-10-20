import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Baja, Perfil } from './personal';

export const PERSONAL_PATH = 'private/personal.json';
export const BAJAS_PATH = 'private/bajas.json';

type PerfilDoc = { version: 1; updated_at: string; profiles: Perfil[] };
type BajasDoc = { version: 1; bajas: Baja[] };

function github() {
  return {
    owner: process.env.ADMIN_GITHUB_OWNER || 'AminVentura',
    repo: process.env.ADMIN_GITHUB_REPO || 'Auto-Lava-Garcia',
    branch: process.env.ADMIN_GITHUB_BRANCH || 'main',
    token: process.env.ADMIN_GITHUB_TOKEN || '',
  };
}

function headers(token: string) {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': '2022-11-28',
  };
}

async function readDoc<T>(filePath: string, empty: T): Promise<T> {
  const cfg = github();
  if (!cfg.token) {
    try {
      return JSON.parse(await readFile(path.join(process.cwd(), filePath), 'utf8')) as T;
    } catch {
      return empty;
    }
  }
  const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${filePath}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, { headers: headers(cfg.token), cache: 'no-store' });
  if (res.status === 404) return empty;
  if (!res.ok) throw new Error('No se pudo leer el personal.');
  const body = (await res.json()) as { content?: string };
  return JSON.parse(Buffer.from(String(body.content || ''), 'base64').toString('utf8')) as T;
}

async function writeDoc(filePath: string, doc: unknown, message: string): Promise<void> {
  const cfg = github();
  const raw = JSON.stringify(doc, null, 2) + '\n';
  if (!cfg.token) {
    if (process.env.NODE_ENV === 'production') throw new Error('ADMIN_GITHUB_TOKEN no está configurado.');
    const absolute = path.join(process.cwd(), filePath);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, raw, 'utf8');
    return;
  }
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${filePath}`;
  const current = await fetch(`${apiUrl}?ref=${encodeURIComponent(cfg.branch)}`, { headers: headers(cfg.token), cache: 'no-store' });
  let sha: string | null = null;
  if (current.ok) sha = ((await current.json()) as { sha?: string }).sha || null;
  else if (current.status !== 404) throw new Error('No se pudo preparar el registro.');
  const put = await fetch(apiUrl, {
    method: 'PUT',
    headers: headers(cfg.token),
    body: JSON.stringify({
      message,
      content: Buffer.from(raw, 'utf8').toString('base64'),
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!put.ok) throw new Error('GitHub rechazó el guardado del personal.');
}

export async function leerPerfiles(): Promise<Perfil[]> {
  const doc = await readDoc<PerfilDoc>(PERSONAL_PATH, { version: 1, updated_at: '', profiles: [] });
  return Array.isArray(doc.profiles) ? doc.profiles : [];
}

export async function guardarPerfiles(profiles: Perfil[]): Promise<void> {
  await writeDoc(PERSONAL_PATH, { version: 1, updated_at: new Date().toISOString(), profiles }, 'chore: actualizar personal del local');
}

export async function leerBajas(): Promise<Baja[]> {
  const doc = await readDoc<BajasDoc>(BAJAS_PATH, { version: 1, bajas: [] });
  return Array.isArray(doc.bajas) ? doc.bajas : [];
}

export async function writeBaja(baja: Baja): Promise<void> {
  const bajas = [baja, ...(await leerBajas())].slice(0, 400);
  await writeDoc(BAJAS_PATH, { version: 1, bajas }, 'chore: registrar baja de pedido');
}
