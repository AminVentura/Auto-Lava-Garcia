/**
 * generate-sitemap.js — antojosbarlounge.com
 * Uso: node generate-sitemap.js
 * Escanea public/*.html (páginas que Vercel sirve) y escribe public/sitemap.xml.
 * Propiedad de Businessskore — Licencia Propietaria (NO GPL).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://antojosbarlounge.com';
const SITE_DIR = path.join(__dirname, 'public');
const OUTPUT = path.join(SITE_DIR, 'sitemap.xml');
const TODAY = new Date().toISOString().split('T')[0];

const EXCLUDED = new Set([
  'aviso-legal.html',
  'politica-privacidad.html',
  'politica-cookies.html',
  'qr/index.html',
]);

const PAGE_CONFIG = {
  'index.html': { priority: '1.0', changefreq: 'weekly' },
  'menu.html': { priority: '0.9', changefreq: 'weekly' },
  'servicios-lavado.html': { priority: '0.9', changefreq: 'weekly' },
  'guias.html': { priority: '0.9', changefreq: 'weekly' },
  'como-elegir-servicio-de-lavado.html': { priority: '0.8', changefreq: 'monthly' },
  'desayuno-dominicano-santiago-mangu-3-golpes.html': { priority: '0.8', changefreq: 'monthly' },
  'detailing-interior-vs-lavado-normal.html': { priority: '0.8', changefreq: 'monthly' },
  'lavado-por-debajo-despues-de-lluvia-santiago.html': { priority: '0.8', changefreq: 'monthly' },
  'que-pedir-en-antojos-mientras-esperas.html': { priority: '0.8', changefreq: 'monthly' },
  'llaves-y-administracion.html': { priority: '0.8', changefreq: 'monthly' },
  'recorrido-del-local.html': { priority: '0.8', changefreq: 'monthly' },
  'lounge-cigarros-antojos.html': { priority: '0.8', changefreq: 'monthly' },
  'eventos-buffet-antojos.html': { priority: '0.8', changefreq: 'monthly' },
  'ofertas.html': { priority: '0.8', changefreq: 'weekly' },
  'como-llegar.html': { priority: '0.7', changefreq: 'monthly' },
  'nosotros.html': { priority: '0.7', changefreq: 'monthly' },
  'preguntas-frecuentes.html': { priority: '0.7', changefreq: 'monthly' },
  'contacto.html': { priority: '0.7', changefreq: 'monthly' },
};

const DEFAULT_CONFIG = { priority: '0.5', changefreq: 'monthly' };

function getLastMod(filePath) {
  try {
    return fs.statSync(filePath).mtime.toISOString().split('T')[0];
  } catch {
    return TODAY;
  }
}

function listPublicHtml(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === 'qr') continue;
      files.push(...listPublicHtml(path.join(dir, entry.name), rel));
      continue;
    }
    if (entry.name.endsWith('.html') && !EXCLUDED.has(rel) && !EXCLUDED.has(entry.name)) {
      // Las páginas con noindex no van al sitemap (lo marca scripts/aplicar-plantilla.mjs).
      const html = fs.readFileSync(path.join(dir, entry.name), 'utf8');
      if (/<meta name="robots" content="[^"]*noindex/i.test(html)) continue;
      files.push(rel);
    }
  }
  return files;
}

function buildUrl(rel) {
  const fileName = path.basename(rel);
  const isIndex = fileName === 'index.html' && !rel.includes('/');
  const loc = isIndex ? `${BASE_URL}/` : `${BASE_URL}/${rel}`;
  const config = PAGE_CONFIG[fileName] || PAGE_CONFIG[rel] || DEFAULT_CONFIG;
  const lastmod = getLastMod(path.join(SITE_DIR, rel));
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${config.changefreq}</changefreq>\n    <priority>${config.priority}</priority>\n  </url>`;
}

function generateSitemap() {
  const files = listPublicHtml(SITE_DIR).sort((a, b) => {
    if (a === 'index.html') return -1;
    if (b === 'index.html') return 1;
    const pA = parseFloat((PAGE_CONFIG[path.basename(a)] || DEFAULT_CONFIG).priority);
    const pB = parseFloat((PAGE_CONFIG[path.basename(b)] || DEFAULT_CONFIG).priority);
    return pB - pA;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

${files.map(buildUrl).join('\n\n')}

</urlset>
`;

  fs.writeFileSync(OUTPUT, xml, 'utf8');
  console.log(`sitemap.xml generado con ${files.length} URLs`);
  files.forEach((rel) => {
    const loc = rel === 'index.html' ? `${BASE_URL}/` : `${BASE_URL}/${rel}`;
    console.log(`   ${loc}`);
  });
}

generateSitemap();
