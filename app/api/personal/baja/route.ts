import { claveCoincide } from '@/lib/personal-clave';
import { leerPerfiles, writeBaja } from '@/lib/personal-github';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    id?: string;
    clave?: string;
    reservaId?: string;
    cliente?: string;
    razon?: string;
  } | null;
  const id = String(body?.id || '');
  const clave = String(body?.clave || '');
  const razon = String(body?.razon || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const reservaId = String(body?.reservaId || '').slice(0, 40);
  const cliente = String(body?.cliente || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!/^rol-[a-z]{2,20}$/.test(id) || clave.length < 8 || razon.length < 3 || reservaId.length < 2) {
    return Response.json({ error: 'datos_invalidos' }, { status: 400 });
  }
  const perfiles = await leerPerfiles().catch(() => null);
  if (!perfiles) return Response.json({ error: 'no_disponible' }, { status: 503 });
  const perfil = perfiles.find((row) => row.id === id && row.active);
  if (!perfil || !claveCoincide(clave, perfil.salt, perfil.hash)) {
    return Response.json({ error: 'credenciales_invalidas' }, { status: 401 });
  }
  await writeBaja({
    at: new Date().toISOString(),
    perfilId: perfil.id,
    nombre: perfil.nombre,
    area: perfil.area,
    reservaId,
    cliente: cliente || 'Sin nombre',
    razon,
  });
  return Response.json({ ok: true });
}
