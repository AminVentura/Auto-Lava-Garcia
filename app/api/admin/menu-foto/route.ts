import { getAdminSession } from '@/lib/admin-auth';
import { listaAdminsConfigurada } from '@/lib/admin-lista';
import { buildGithubContentsPutBody } from '@/lib/github-contents';
import { bytesDeWebp, idPlato, permisoDeclarado, puedeSubirFoto, urlFotoPlato } from '@/lib/menuFoto';

function githubConfig() {
  return {
    owner: process.env.ADMIN_GITHUB_OWNER || 'AminVentura',
    repo: process.env.ADMIN_GITHUB_REPO || 'Auto-Lava-Garcia',
    branch: process.env.ADMIN_GITHUB_BRANCH || 'main',
    token: process.env.ADMIN_GITHUB_TOKEN || '',
  };
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.ok) return Response.json({ error: session.message }, { status: session.status });
  // Cada foto es un commit a main y publica la web: sin lista de administradores no sube nadie.
  if (!listaAdminsConfigurada()) {
    return Response.json({ error: 'Falta ADMIN_EMAILS: nadie puede subir fotos.' }, { status: 403 });
  }

  const config = githubConfig();
  if (!config.token) {
    return Response.json({ error: 'Falta ADMIN_GITHUB_TOKEN en el servidor.' }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { id?: unknown; imagen?: unknown; permisoFoto?: unknown } | null;
  if (!permisoDeclarado(body?.permisoFoto)) {
    return Response.json({ error: 'Confirma que tienes permiso para usar esta foto.' }, { status: 400 });
  }
  const id = idPlato(body?.id);
  const bytes = bytesDeWebp(body?.imagen);
  if (!id || !bytes) {
    return Response.json({ error: 'La foto tiene que ser webp del plato, de hasta 350 KB.' }, { status: 400 });
  }
  if (!puedeSubirFoto(session.email)) {
    return Response.json({ error: 'Muchas fotos seguidas. Espera unos minutos.' }, { status: 429 });
  }

  const filePath = `public/menu-fotos/${id}.webp`;
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${filePath}`;
  const headers = {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${config.token}`,
    'x-github-api-version': '2022-11-28',
  };
  const actual = await fetch(`${apiUrl}?ref=${encodeURIComponent(config.branch)}`, { headers });
  let sha: string | null = null;
  if (actual.ok) {
    const json = await actual.json() as { sha?: string };
    sha = json.sha || null;
  } else if (actual.status !== 404) {
    return Response.json({ error: 'GitHub no dejó leer la foto.' }, { status: 503 });
  }

  // El repositorio es público: el commit no lleva el correo del administrador.
  const put = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify(buildGithubContentsPutBody({
      message: `foto del plato ${id} (permiso de uso declarado en el panel)`,
      content: Buffer.from(bytes).toString('base64'),
      branch: config.branch,
      sha,
    })),
  });
  if (!put.ok) {
    return Response.json({ error: 'GitHub no dejó guardar la foto. El token necesita permiso de escritura.' }, { status: 503 });
  }

  // Constancia de quién declaró el permiso (logs de Vercel, no van al repositorio público).
  console.info(JSON.stringify({
    evento: 'foto_plato_subida',
    plato: id,
    admin: session.email,
    permisoDeclarado: true,
    fecha: new Date().toISOString(),
  }));

  return Response.json({ ok: true, foto: urlFotoPlato(id) });
}
