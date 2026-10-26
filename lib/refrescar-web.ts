/**
 * Botón «Refrescar web»: lanza el workflow de GitHub Actions que publica la web pública en
 * Firebase Hosting (workflow_dispatch) y lee su estado. El token vive SOLO en el servidor:
 * fine-grained, un único repositorio, permiso Actions: Read and write.
 *
 * Límite: una publicación cada WEB_REFRESH_MIN_SECONDS (120 s por defecto). Se mira en memoria
 * y además en GitHub (la última corrida), así vale aunque Vercel tenga varias instancias.
 * Mismo archivo en CitaElCache10 (lib/refrescarWeb.ts) y AutoLavaGarcia (lib/refrescar-web.ts).
 */

export type EstadoWeb = 'apagado' | 'sin_publicaciones' | 'en_cola' | 'publicando' | 'listo' | 'fallo';

export type RefrescarConfig = {
  token: string;
  repo: string;
  workflow: string;
  ref: string;
  minIntervalMs: number;
  faltan: string[];
};

export type EstadoPublicacion = {
  estado: EstadoWeb;
  mensaje: string;
  runUrl?: string;
  creado?: string;
  actualizado?: string;
  evento?: string;
};

export type ResultadoLanzar = EstadoPublicacion & {
  ok: boolean;
  status: number;
  reintentarEnSeg?: number;
};

type Env = Record<string, string | undefined>;
type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const WORKFLOW_RE = /^[A-Za-z0-9_.-]+\.ya?ml$/;
const REF_RE = /^[A-Za-z0-9._/-]+$/;

export function refrescarConfig(env: Env = process.env, defaults: { repo: string; workflow?: string } = { repo: '' }): RefrescarConfig {
  const token = String(env.WEB_REFRESH_GITHUB_TOKEN || '').trim();
  const repo = String(env.WEB_REFRESH_REPO || defaults.repo).trim();
  const workflow = String(env.WEB_REFRESH_WORKFLOW || defaults.workflow || 'firebase-hosting.yml').trim();
  const ref = String(env.WEB_REFRESH_REF || 'main').trim();
  const seconds = Number(env.WEB_REFRESH_MIN_SECONDS || 120);
  const faltan: string[] = [];
  if (!token) faltan.push('WEB_REFRESH_GITHUB_TOKEN');
  if (!REPO_RE.test(repo)) faltan.push('WEB_REFRESH_REPO');
  if (!WORKFLOW_RE.test(workflow)) faltan.push('WEB_REFRESH_WORKFLOW');
  if (!REF_RE.test(ref)) faltan.push('WEB_REFRESH_REF');
  return {
    token,
    repo,
    workflow,
    ref,
    minIntervalMs: Math.max(30, Number.isFinite(seconds) ? seconds : 120) * 1000,
    faltan,
  };
}

function headers(token: string) {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': '2022-11-28',
    'user-agent': 'businessskore-refrescar-web',
  };
}

type Run = {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  event: string;
};

const MENSAJES: Record<EstadoWeb, string> = {
  apagado: 'La publicación automática está apagada: falta configurarla (ver docs/REFRESCAR-WEB-2026-10-26.md).',
  sin_publicaciones: 'Todavía no hay publicaciones.',
  en_cola: 'En cola: GitHub va a empezar a publicar.',
  publicando: 'Publicando la web…',
  listo: 'Listo: la web ya tiene los cambios. Recarga la página para verlos.',
  fallo: 'La publicación falló. Avísale a Amin.',
};

export function mensajeEstado(estado: EstadoWeb): string {
  return MENSAJES[estado];
}

/** Traduce una corrida de GitHub Actions a en_cola / publicando / listo / fallo / apagado. */
export function estadoDeRun(run: Pick<Run, 'status' | 'conclusion'>, publicarSaltado = false): EstadoWeb {
  if (run.status === 'in_progress') return 'publicando';
  if (run.status !== 'completed') return 'en_cola';
  if (run.conclusion === 'success') return publicarSaltado ? 'apagado' : 'listo';
  if (run.conclusion === 'skipped') return 'apagado';
  return 'fallo';
}

async function ultimaCorrida(cfg: RefrescarConfig, fetchImpl: FetchLike): Promise<Run | null> {
  const url = `https://api.github.com/repos/${cfg.repo}/actions/workflows/${encodeURIComponent(cfg.workflow)}/runs?per_page=1&branch=${encodeURIComponent(cfg.ref)}`;
  const res = await fetchImpl(url, { headers: headers(cfg.token), cache: 'no-store' });
  if (!res.ok) throw new Error(`GitHub no dio el estado (${res.status}).`);
  const data = (await res.json()) as { workflow_runs?: Run[] };
  return data.workflow_runs?.[0] || null;
}

/** El job «publicar» se salta cuando FIREBASE_DEPLOY_ENABLED no vale true: eso es «apagado», no «listo». */
async function publicarSaltado(cfg: RefrescarConfig, runId: number, fetchImpl: FetchLike): Promise<boolean> {
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${cfg.repo}/actions/runs/${runId}/jobs?per_page=20`, {
      headers: headers(cfg.token),
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { jobs?: { name: string; conclusion: string | null }[] };
    const job = (data.jobs || []).find((j) => /^publicar/i.test(j.name));
    return Boolean(job && job.conclusion === 'skipped');
  } catch {
    return false;
  }
}

export async function estadoPublicacion(cfg: RefrescarConfig, fetchImpl: FetchLike = fetch): Promise<EstadoPublicacion> {
  if (cfg.faltan.length) {
    return { estado: 'apagado', mensaje: `${MENSAJES.apagado} Falta: ${cfg.faltan.join(', ')}.` };
  }
  const run = await ultimaCorrida(cfg, fetchImpl);
  if (!run) return { estado: 'sin_publicaciones', mensaje: MENSAJES.sin_publicaciones };
  const saltado = run.status === 'completed' && run.conclusion === 'success' ? await publicarSaltado(cfg, run.id, fetchImpl) : false;
  const estado = estadoDeRun(run, saltado);
  return {
    estado,
    mensaje: MENSAJES[estado],
    runUrl: run.html_url,
    creado: run.created_at,
    actualizado: run.updated_at,
    evento: run.event,
  };
}

let ultimoLanzamiento = 0;

/** Solo para tests. */
export function reiniciarLimite() {
  ultimoLanzamiento = 0;
}

export async function lanzarPublicacion(
  cfg: RefrescarConfig,
  opts: { fetchImpl?: FetchLike; now?: number; motivo?: string } = {},
): Promise<ResultadoLanzar> {
  const fetchImpl = opts.fetchImpl || fetch;
  const now = opts.now ?? Date.now();
  if (cfg.faltan.length) {
    return { ok: false, status: 503, estado: 'apagado', mensaje: `${MENSAJES.apagado} Falta: ${cfg.faltan.join(', ')}.` };
  }

  const espera = ultimoLanzamiento + cfg.minIntervalMs - now;
  if (espera > 0) {
    const seg = Math.ceil(espera / 1000);
    return { ok: false, status: 429, estado: 'en_cola', mensaje: `Ya se pidió hace poco. Espera ${seg} s.`, reintentarEnSeg: seg };
  }

  const run = await ultimaCorrida(cfg, fetchImpl);
  if (run && run.status !== 'completed') {
    const estado = estadoDeRun(run);
    return { ok: true, status: 202, estado, mensaje: `Ya hay una publicación en marcha. ${MENSAJES[estado]}`, runUrl: run.html_url, creado: run.created_at };
  }
  if (run) {
    const desde = now - Date.parse(run.created_at);
    if (Number.isFinite(desde) && desde >= 0 && desde < cfg.minIntervalMs) {
      const seg = Math.ceil((cfg.minIntervalMs - desde) / 1000);
      return { ok: false, status: 429, estado: estadoDeRun(run), mensaje: `Se publicó hace menos de ${Math.round(cfg.minIntervalMs / 60000)} min. Espera ${seg} s.`, reintentarEnSeg: seg, runUrl: run.html_url };
    }
  }

  const res = await fetchImpl(
    `https://api.github.com/repos/${cfg.repo}/actions/workflows/${encodeURIComponent(cfg.workflow)}/dispatches`,
    {
      method: 'POST',
      headers: { ...headers(cfg.token), 'content-type': 'application/json' },
      body: JSON.stringify({ ref: cfg.ref, inputs: { motivo: String(opts.motivo || 'boton-refrescar').slice(0, 60) } }),
      cache: 'no-store',
    },
  );
  if (res.status !== 204 && res.status !== 200) {
    const status = res.status === 401 || res.status === 403 || res.status === 404 ? 503 : 502;
    return {
      ok: false,
      status,
      estado: 'fallo',
      mensaje:
        status === 503
          ? `GitHub rechazó el token o no encuentra el workflow (${res.status}). Revisa WEB_REFRESH_GITHUB_TOKEN (Actions: Read and write) y WEB_REFRESH_WORKFLOW.`
          : `GitHub no aceptó la publicación (${res.status}).`,
    };
  }
  ultimoLanzamiento = now;
  return { ok: true, status: 202, estado: 'en_cola', mensaje: MENSAJES.en_cola };
}
