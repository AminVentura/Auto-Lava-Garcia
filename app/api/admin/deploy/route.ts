import { getAdminSession } from '@/lib/admin-auth';
import { triggerAdminDeploy } from '@/lib/admin-automation';

export async function POST() {
  const session = await getAdminSession();
  if (!session.ok) {
    return Response.json({ error: session.message }, { status: session.status });
  }

  try {
    await triggerAdminDeploy();
    return Response.json({ ok: true, triggeredBy: session.email });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'No se pudo actualizar la web.' },
      { status: 503 },
    );
  }
}
