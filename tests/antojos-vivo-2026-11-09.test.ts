/** antojosbarlounge.com lee carta, promos y feriados del panel de AntojosReserva (2026-11-09). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pub = path.join(__dirname, '..', 'public');
const js = readFileSync(path.join(pub, 'js', 'antojos-vivo.js'), 'utf8');

describe('datos en vivo del panel', () => {
  it('solo lee de la API pública de solo lectura, sin cookies', () => {
    expect(js).toContain("'https://antojosreserva.antojosbarlounge.com/api/md/web'");
    expect(js).toContain("credentials: 'omit'");
    expect(js).not.toMatch(/method:\s*'(POST|PUT|DELETE)'/);
  });
  it('escapa todo lo que viene del panel y solo acepta fotos https', () => {
    expect(js).toMatch(/function esc\(/);
    expect(js).toContain(String.raw`/^https:\/\/[^\s"'<>]+$/`);
  });
  it('cada página con hueco carga el script', () => {
    for (const f of ['menu.html', 'ofertas.html', 'contacto.html', 'como-llegar.html', 'index.html']) {
      const h = readFileSync(path.join(pub, f), 'utf8');
      expect(h, f).toMatch(/data-(carta|promos|feriados)-vivo hidden/);
      expect(h, f).toContain('<script src="js/antojos-vivo.js" defer></script>');
    }
  });
});
