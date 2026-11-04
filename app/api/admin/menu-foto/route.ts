import { getAdminSession } from '@/lib/admin-auth';
import { buildGithubContentsPutBody } from '@/lib/github-contents';
import { bytesDeWebp, idPlato, urlFotoPlato } from '@/lib/menuFoto';

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

  const config = githubConfig();
  if (!config.token) {
    return Response.json({ error: 'Falta ADMIN_GITHUB_TOKEN en el servidor.' }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { id?: unknown; imagen?: unknown } | null;
  const id = idPlato(body?.id);
  const bytes = bytesDeWebp(body?.imagen);
  if (!id || !bytes) {
    return Response.json({ error: 'La foto tiene que ser webp del plato, de hasta 350 KB.' }, { status: 400 });
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

  const put = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify(buildGithubContentsPutBody({
      message: `foto del plato ${id}`,
      content: Buffer.from(bytes).toString('base64'),
      branch: config.branch,
      sha,
    })),
  });
  if (!put.ok) {
    return Response.json({ error: 'GitHub no dejó guardar la foto. El token necesita permiso de escritura.' }, { status: 503 });
  }

  return Response.json({ ok: true, foto: urlFotoPlato(id) });
}
