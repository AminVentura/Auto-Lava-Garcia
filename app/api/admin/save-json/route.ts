import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { getAdminSession } from '@/lib/admin-auth';
import { getAdminSaveConfigStatus } from '@/lib/admin-save-config';
import { buildGithubContentsPutBody } from '@/lib/github-contents';

type SaveTarget = 'ofertas' | 'lavado' | 'menu';

const targetPath: Record<SaveTarget, string> = {
  ofertas: 'data/ofertas.json',
  lavado: 'data/lavado_precios.json',
  menu: 'data/menu_restaurante.json',
};

function isTarget(value: unknown): value is SaveTarget {
  return value === 'ofertas' || value === 'lavado' || value === 'menu';
}

function githubConfig() {
  return {
    owner: process.env.ADMIN_GITHUB_OWNER || 'AminVentura',
    repo: process.env.ADMIN_GITHUB_REPO || 'Auto-Lava-Garcia',
    branch: process.env.ADMIN_GITHUB_BRANCH || 'main',
    token: process.env.ADMIN_GITHUB_TOKEN || '',
  };
}

function githubHeaders(token: string) {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': '2022-11-28',
  };
}

async function commitJson(filePath: string, doc: unknown, message: string) {
  const config = githubConfig();
  if (!config.token) {
    if (process.env.NODE_ENV !== 'production') {
      const absolutePath = path.join(process.cwd(), filePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
      return { mode: 'local' };
    }
    throw new Error('ADMIN_GITHUB_TOKEN no está configurado en Vercel.');
  }

  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${filePath}`;
  const currentResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(config.branch)}`, {
    headers: githubHeaders(config.token),
  });
  let sha: string | null = null;
  if (currentResponse.ok) {
    const current = await currentResponse.json();
    sha = current.sha;
  } else if (currentResponse.status !== 404) {
    const detail = await currentResponse.text();
    throw new Error(`GitHub no pudo leer ${filePath}: ${detail.slice(0, 180)}`);
  }

  const putResponse = await fetch(apiUrl, {
    method: 'PUT',
    headers: githubHeaders(config.token),
    body: JSON.stringify(buildGithubContentsPutBody({
      message,
      content: Buffer.from(JSON.stringify(doc, null, 2) + '\n', 'utf8').toString('base64'),
      branch: config.branch,
      sha,
    })),
  });

  if (!putResponse.ok) {
    const detail = await putResponse.text();
    throw new Error(`GitHub rechazó el guardado: ${detail.slice(0, 180)}`);
  }

  return { mode: 'github' };
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.ok) {
    return Response.json({ error: session.message }, { status: session.status });
  }

  try {
    const body = await request.json();
    const target = body.target;
    if (!isTarget(target)) {
      return Response.json({ error: 'Destino JSON inválido.' }, { status: 400 });
    }

    const filePath = targetPath[target];
    const doc = {
      ...(body.doc || {}),
      updated_at: new Date().toISOString(),
    };

    const configStatus = getAdminSaveConfigStatus();
    if (!configStatus.ok) {
      return Response.json(
        {
          error: [
            `Guardado remoto no configurado. Falta: ${configStatus.missing.join(', ')}.`,
            configStatus.warning,
          ].filter(Boolean).join(' '),
          missing: configStatus.missing,
        },
        { status: 503 },
      );
    }

    const result = await commitJson(filePath, doc, `chore: actualizar ${target} desde admin`);

    return Response.json({ ok: true, savedBy: session.email, filePath, mode: result.mode });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'No se pudo guardar.' },
      { status: 500 },
    );
  }
}
