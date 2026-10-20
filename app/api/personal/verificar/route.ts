import { claveCoincide } from '@/lib/personal-clave';
import { leerPerfiles } from '@/lib/personal-github';
import { mismoNombre, normalizarNombre } from '@/lib/personal-nombre';

const intentos = new Map<string, { n: number; hasta: number }>();

function bloqueado(nombre: string): boolean {
  const row = intentos.get(nombre);
  if (!row) return false;
  if (Date.now() > row.hasta) {
    intentos.delete(nombre);
    return false;
  }
  return row.n >= 8;
}

function fallo(nombre: string) {
  const row = intentos.get(nombre) || { n: 0, hasta: Date.now() + 15 * 60_000 };
  row.n += 1;
  row.hasta = Date.now() + 15 * 60_000;
  intentos.set(nombre, row);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { nombre?: string; clave?: string } | null;
  const nombre = normalizarNombre(body?.nombre || '');
  const clave = String(body?.clave || '');
  if (nombre.length < 2 || clave.length < 8 || bloqueado(nombre)) {
    return Response.json({ error: 'credenciales_invalidas' }, { status: 401 });
  }
  const perfiles = await leerPerfiles().catch(() => null);
  if (!perfiles) return Response.json({ error: 'no_disponible' }, { status: 503 });
  const perfil = perfiles.find((row) => row.active && mismoNombre(row.nombre, nombre));
  if (!perfil || !claveCoincide(clave, perfil.salt, perfil.hash)) {
    fallo(nombre);
    return Response.json({ error: 'credenciales_invalidas' }, { status: 401 });
  }
  intentos.delete(nombre);
  return Response.json({ id: perfil.id, area: perfil.area });
}
