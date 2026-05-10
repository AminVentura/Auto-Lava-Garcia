/**
 * generate-sitemap.js — antojosbarlounge.com
 * Uso: node generate-sitemap.js
 * Genera sitemap.xml en la raíz del proyecto escaneando todos los .html públicos.
 * Propiedad de Businessskore — Licencia Propietaria (NO GPL).
 */

const fs = require('fs');
const path = require('path');

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
const BASE_URL = 'https://antojosbarlounge.com';
const SITE_DIR = __dirname;
const OUTPUT   = path.join(SITE_DIR, 'sitemap.xml');
const TODAY    = new Date().toISOString().split('T')[0];

// Páginas a EXCLUIR del sitemap
const EXCLUDED = new Set([]);

// Prioridades y frecuencias por página
const PAGE_CONFIG = {
  'index.html':              { priority: '1.0', changefreq: 'weekly' },
  'aviso-legal.html':        { priority: '0.3', changefreq: 'yearly' },
  'politica-privacidad.html':{ priority: '0.3', changefreq: 'yearly' },
  'politica-cookies.html':   { priority: '0.3', changefreq: 'yearly' },
};

const DEFAULT_CONFIG = { priority: '0.5', changefreq: 'monthly' };
// ──────────────────────────────────────────────────────────────────────────────

function getLastMod(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.mtime.toISOString().split('T')[0];
  } catch {
    return TODAY;
  }
}

function buildUrl(file) {
  const fileName = path.basename(file);
  const isIndex  = fileName === 'index.html';
  const loc      = isIndex ? `${BASE_URL}/` : `${BASE_URL}/${fileName}`;
  const config   = PAGE_CONFIG[fileName] || DEFAULT_CONFIG;
  const lastmod  = getLastMod(file);

  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${config.changefreq}</changefreq>\n    <priority>${config.priority}</priority>\n  </url>`;
}

function generateSitemap() {
  try {
    const files = fs.readdirSync(SITE_DIR)
      .filter(f => f.endsWith('.html') && !EXCLUDED.has(f))
      .sort((a, b) => {
        if (a === 'index.html') return -1;
        if (b === 'index.html') return 1;
        const pA = parseFloat((PAGE_CONFIG[a] || DEFAULT_CONFIG).priority);
        const pB = parseFloat((PAGE_CONFIG[b] || DEFAULT_CONFIG).priority);
        return pB - pA;
      })
      .map(f => path.join(SITE_DIR, f));

    const urlEntries = files.map(buildUrl).join('\n\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

${urlEntries}

</urlset>
`;

    fs.writeFileSync(OUTPUT, xml, 'utf8');
    console.log(`✅ sitemap.xml generado con ${files.length} URLs`);
    console.log(`📄 Guardado en: ${OUTPUT}`);
    console.log('\n🔗 URLs incluidas:');
    files.forEach(f => {
      const name = path.basename(f);
      const loc  = name === 'index.html' ? `${BASE_URL}/` : `${BASE_URL}/${name}`;
      console.log(`   ${loc}`);
    });
    console.log('\n📋 Próximo paso: Enviar sitemap en Google Search Console');
    console.log(`   URL: ${BASE_URL}/sitemap.xml`);

  } catch (err) {
    console.error('❌ Error generando sitemap:', err.message);
    process.exit(1);
  }
}

generateSitemap();
