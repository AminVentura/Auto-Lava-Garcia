import { getAdminSession } from '@/lib/admin-auth';
import { getAdminSaveConfigStatus } from '@/lib/admin-save-config';

const jsonFiles = [
  { label: 'Ofertas', path: 'data/ofertas.json' },
  { label: 'Lavado', path: 'data/lavado_precios.json' },
  { label: 'Restaurante', path: 'data/menu_restaurante.json' },
];

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

async function getJsonFileStatus(filePath: string) {
  const config = githubConfig();
  if (!config.token) return 'sin-token';

  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${filePath}`;
  const response = await fetch(`${apiUrl}?ref=${encodeURIComponent(config.branch)}`, {
    headers: githubHeaders(config.token),
    cache: 'no-store',
  });

  if (response.ok) return 'existe';
  if (response.status === 404) return 'se-crea-al-guardar';
  return 'revisar-permisos';
}

export async function GET() {
  const session = await getAdminSession();
  if (!session.ok) {
    return Response.json({ error: session.message }, { status: session.status });
  }

  const config = githubConfig();
  const configStatus = getAdminSaveConfigStatus();
  const files = await Promise.all(
    jsonFiles.map(async (file) => ({
      ...file,
      status: await getJsonFileStatus(file.path),
    })),
  );

  return Response.json({
    github: {
      repo: `${config.owner}/${config.repo}`,
      branch: config.branch,
      tokenConfigured: Boolean(config.token),
      ok: configStatus.ok,
      warning: configStatus.warning,
    },
    files,
    automation: {
      manualSocialReady: true,
      deployHookConfigured: Boolean(process.env.ADMIN_VERCEL_DEPLOY_HOOK_URL),
    },
  });
}
