import { getAdminSession } from '@/lib/admin-auth';

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.ok) {
    return Response.json({ error: session.message }, { status: session.status });
  }

  try {
    const payload = await request.json();
    return Response.json({
      ok: true,
      mode: 'manual',
      message: 'Publicación manual gratuita: copia el caption, descarga la imagen y publica desde las cuentas oficiales.',
      payload,
      sentBy: session.email,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'No se pudo preparar la publicación manual.' },
      { status: 400 },
    );
  }
}
