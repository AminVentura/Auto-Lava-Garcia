import { getAdminSession } from '@/lib/admin-auth';
import { guardarCargo, vistaCargos } from '@/lib/personal';
import { guardarPerfiles, leerBajas, leerPerfiles } from '@/lib/personal-github';

export async function GET() {
  const session = await getAdminSession();
  if (!session.ok) return Response.json({ error: session.message }, { status: session.status });
  try {
    const [profiles, bajas] = await Promise.all([leerPerfiles(), leerBajas()]);
    return Response.json({
      cargos: vistaCargos(profiles),
      bajas: bajas.slice(0, 40).map((baja) => ({
        at: String(baja.at || ''),
        nombre: baja.nombre,
        area: baja.area,
        reservaId: baja.reservaId,
        cliente: baja.cliente,
        razon: baja.razon,
      })),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo leer el personal.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.ok) return Response.json({ error: session.message }, { status: session.status });
  const body = (await request.json().catch(() => null)) as { id?: string; nombre?: string; clave?: string } | null;
  if (!body) return Response.json({ error: 'Datos inválidos.' }, { status: 400 });
  try {
    const actuales = await leerPerfiles();
    const next = guardarCargo(actuales, { id: String(body.id || ''), nombre: body.nombre || '', clave: body.clave || '' });
    if (next.error) return Response.json({ error: next.error }, { status: 400 });
    await guardarPerfiles(next.lista);
    return Response.json({ ok: true, cargos: vistaCargos(next.lista) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo guardar el perfil.' }, { status: 500 });
  }
}
