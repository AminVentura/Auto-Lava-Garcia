import { aplicarAccion, vistaPublica } from '@/lib/personal';
import { guardarPerfiles, leerPerfiles } from '@/lib/personal-github';
import { puenteValido } from '@/lib/personal-puente';

function negar() {
  return Response.json({ error: 'no_autorizado' }, { status: 401 });
}

export async function GET(request: Request) {
  if (!puenteValido(request.headers.get('x-personal-bridge'))) return negar();
  try {
    const perfiles = await leerPerfiles();
    return Response.json({ perfiles: vistaPublica(perfiles) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo leer el personal.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!puenteValido(request.headers.get('x-personal-bridge'))) return negar();
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    id?: string;
    nombre?: string;
    area?: string;
    clave?: string;
  } | null;
  if (!body) return Response.json({ error: 'Datos inválidos.' }, { status: 400 });
  try {
    const actuales = await leerPerfiles();
    const next = aplicarAccion(actuales, body);
    if (next.error) return Response.json({ error: next.error }, { status: 400 });
    await guardarPerfiles(next.lista);
    return Response.json({ ok: true, perfiles: vistaPublica(next.lista) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo guardar el perfil.' }, { status: 500 });
  }
}
