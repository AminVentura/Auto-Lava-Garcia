/**
 * aplicar-plantilla.mjs — antojosbarlounge.com
 * Uso: node scripts/aplicar-plantilla.mjs
 *
 * Deja la misma cabecera, el mismo pie y la misma carga de consentimiento en todas
 * las páginas de public/*.html. Es idempotente: se puede ejecutar tras editar una página.
 *
 * - Navegación y pie únicos (antes cada página tenía un menú distinto).
 * - /js/consent.js en el <head>; AdSense ya no se carga desde el HTML.
 * - SIN_ANUNCIOS: páginas donde no deben salir anuncios (legales, contacto, tabaco).
 * - NO_INDEXAR: páginas que repiten la lista de precios de otras; salen del índice y del sitemap
 *   hasta que tengan contenido propio (fotos, tiempos reales del servicio).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

export const NO_INDEXAR = new Set([
  'como-elegir-servicio-de-lavado.html',
  'lavado-por-debajo-despues-de-lluvia-santiago.html',
  'detailing-interior-vs-lavado-normal.html',
  'que-pedir-en-antojos-mientras-esperas.html',
  'desayuno-dominicano-santiago-mangu-3-golpes.html',
  'aviso-legal.html',
]);

const SIN_ANUNCIOS = new Set([
  ...NO_INDEXAR,
  'politica-privacidad.html',
  'politica-cookies.html',
  'contacto.html',
  'lounge-cigarros-antojos.html',
]);

const NAV = [
  ['/', 'Inicio', 'index.html'],
  ['/menu.html', 'Menú', 'menu.html'],
  ['/servicios-lavado.html', 'Lavadero', 'servicios-lavado.html'],
  ['/ofertas.html', 'Ofertas', 'ofertas.html'],
  ['/guias.html', 'Guías', 'guias.html'],
  ['/nosotros.html', 'Nosotros', 'nosotros.html'],
  ['/preguntas-frecuentes.html', 'Preguntas', 'preguntas-frecuentes.html'],
  ['/como-llegar.html', 'Cómo llegar', 'como-llegar.html'],
  ['/contacto.html', 'Contacto', 'contacto.html'],
];

function header(file) {
  const items = NAV.map(([href, label, f]) =>
    `                <li><a href="${href}"${f === file ? ' aria-current="page"' : ''}>${label}</a></li>`).join('\n');
  return `<header class="header">
        <nav class="nav" aria-label="Principal">
            <a href="/" class="logo">Auto Lava Garcia<span class="logo-accent"> &amp; Antojos</span></a>
            <ul class="nav-links">
${items}
                <li><a href="https://antojosreserva.antojosbarlounge.com/">Ordenar</a></li>
            </ul>
            <button class="nav-toggle" aria-label="Abrir menú"><span></span><span></span><span></span></button>
        </nav>
    </header>`;
}

const FOOTER = `<footer class="footer">
        <div class="container">
            <div class="footer-content">
                <p>© 2026 Auto Lava Garcia &amp; Antojos Bar Lounge — Santiago de los Caballeros, República Dominicana</p>
                <p class="footer-address">Av. 27 de Febrero 156, 51000 · <a href="tel:+18097941824">+1 809-794-1824</a></p>
                <p class="footer-nav">
${NAV.map(([href, label]) => `                    <a href="${href}">${label}</a>`).join(' |\n')} |
                    <a href="/recorrido-del-local.html">Recorrido del local</a> |
                    <a href="/eventos-buffet-antojos.html">Eventos y buffet</a>
                </p>
                <p class="footer-legal">
                    <a href="/aviso-legal.html">Aviso legal</a> |
                    <a href="/politica-privacidad.html">Política de privacidad</a> |
                    <a href="/politica-cookies.html">Política de cookies</a> |
                    <button type="button" class="footer-link-btn" data-cookie-prefs>Preferencias de cookies</button>
                </p>
            </div>
        </div>
    </footer>`;

const MAP_Q = 'Av.+27+de+Febrero+156,+Santiago+de+los+Caballeros+51000,+Republica+Dominicana';
const MAP_HOLDER = `<div class="map-consent" data-map-embed="https://maps.google.com/maps?q=${MAP_Q}&amp;t=&amp;z=16&amp;ie=UTF8&amp;iwloc=&amp;output=embed" data-map-title="Ubicación de Auto Lava Garcia y Antojos Bar Lounge">
                        <p class="map-consent-text">Av. 27 de Febrero 156, Santiago de los Caballeros</p>
                        <p class="map-consent-note">El mapa lo sirve Google Maps, que puede usar cookies. Se carga solo si usted lo pide.</p>
                        <button type="button" class="btn btn-primary map-consent-btn" data-map-load>Cargar mapa</button>
                    </div>`;

let cambiadas = 0;
for (const file of fs.readdirSync(PUBLIC).filter((f) => f.endsWith('.html')).sort()) {
  const full = path.join(PUBLIC, file);
  const antes = fs.readFileSync(full, 'utf8');
  let s = antes;

  s = s.replace(/<header class="header">[\s\S]*?<\/header>/, header(file));
  s = s.replace(/<footer class="footer">[\s\S]*?<\/footer>/, FOOTER);

  // AdSense fuera del HTML: lo inyecta consent.js tras aceptar.
  s = s.replace(/[ \t]*<script async src="https:\/\/pagead2\.googlesyndication\.com[^>]*><\/script>\r?\n/g, '');

  // consent.js síncrono en <head>, justo después de la hoja de estilos.
  s = s.replace(/[ \t]*<script src="\/js\/consent\.js"[^>]*><\/script>\r?\n/g, '');
  const tag = `    <script src="/js/consent.js"${SIN_ANUNCIOS.has(file) ? ' data-ads="off"' : ''}></script>\n`;
  s = s.replace(/(<link rel="stylesheet" href="\/?css\/styles\.css">\r?\n)/, `$1${tag}`);

  // robots
  const robots = NO_INDEXAR.has(file) ? 'noindex, follow' : 'index, follow';
  if (/<meta name="robots"/.test(s)) s = s.replace(/<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${robots}">`);
  else s = s.replace(/(<title>)/, `<meta name="robots" content="${robots}">\n    $1`);

  // Mapa de Google solo a petición.
  s = s.replace(/<iframe[\s\S]*?maps\.google\.com[\s\S]*?<\/iframe>/g, MAP_HOLDER);

  if (!s.includes('/js/consent.js')) throw new Error(`${file}: no se pudo insertar consent.js`);
  if (s !== antes) { fs.writeFileSync(full, s); cambiadas += 1; }
}
console.log(`Plantilla aplicada. Páginas cambiadas: ${cambiadas}`);
