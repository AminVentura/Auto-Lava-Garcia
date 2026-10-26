import { getAdminSession } from '@/lib/admin-auth';
import { listaAdminsConfigurada } from '@/lib/admin-lista';
import { estadoPublicacion, lanzarPublicacion, refrescarConfig } from '@/lib/refrescar-web';

export const runtime = 'nodejs';

/**
 * «Refrescar web»: publica antojosbarlounge.com en Firebase Hosting (workflow firebase-hosting.yml).
 * Solo administradores de ADMIN_EMAILS. Si la lista está vacía no entra nadie (aquí no vale
 * "cualquier cuenta de Clerk").
 */

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store', ...extra } });
}

function config() {
  return refrescarConfig(process.env, { repo: 'AminVentura/Auto-Lava-Garcia', workflow: 'firebase-hosting.yml' });
}

async function soloAdmin() {
  const session = await getAdminSession();
  if (!session.ok) return json({ error: session.message }, session.status);
  if (!listaAdminsConfigurada()) return json({ error: 'Falta ADMIN_EMAILS: nadie puede publicar.' }, 403);
  return null;
}

export async function GET() {
  const denied = await soloAdmin();
  if (denied) return denied;
  try {
    return json(await estadoPublicacion(config()));
  } catch (error) {
    return json({ estado: 'fallo', mensaje: error instanceof Error ? error.message : 'No se pudo leer el estado.' }, 502);
  }
}

export async function POST() {
  const denied = await soloAdmin();
  if (denied) return denied;
  try {
    const result = await lanzarPublicacion(config(), { motivo: 'boton-admin-antojos' });
    return json(result, result.status, result.reintentarEnSeg ? { 'retry-after': String(result.reintentarEnSeg) } : {});
  } catch (error) {
    return json({ ok: false, estado: 'fallo', mensaje: error instanceof Error ? error.message : 'No se pudo publicar.' }, 502);
  }
}
