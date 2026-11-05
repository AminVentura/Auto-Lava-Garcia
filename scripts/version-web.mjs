// Pie con versión y fecha automáticas (estándar Businessskore, 2026-11-04).
// Escribe public/js/version-web.js con la versión de package.json, la fecha del build (hora de Santo Domingo)
// y el commit corto si lo da CI. No se versiona (.gitignore): se genera en el prebuild de Vercel y en el
// workflow de Firebase antes de publicar.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

function commitCorto() {
  const sha = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '';
  if (sha) return sha.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

const fecha = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santo_Domingo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const datos = { version: String(version), fecha, commit: commitCorto() };
if (!/^\d+\.\d+\.\d+$/.test(datos.version)) throw new Error(`Versión inválida en package.json: ${datos.version}`);

const js = `/* Generado por scripts/version-web.mjs. No editar. */
(function () {
  var v = ${JSON.stringify(datos)};
  window.ANTOJOS_VERSION_WEB = v;
  function pintar() {
    var pie = document.querySelector('footer .container') || document.querySelector('footer');
    if (!pie || pie.querySelector('.pie-version')) return;
    var p = document.createElement('p');
    p.className = 'pie-version';
    p.textContent = 'Versión ' + v.version + ' · ' + v.fecha + (v.commit ? ' · ' + v.commit : '');
    pie.appendChild(p);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintar);
  else pintar();
})();
`;

writeFileSync(path.join(root, 'public', 'js', 'version-web.js'), js);
console.log(`version-web: ${datos.version} ${datos.fecha} ${datos.commit}`);
