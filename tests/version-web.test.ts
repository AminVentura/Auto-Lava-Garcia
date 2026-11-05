/** Pie con versión y fecha automáticas (2026-11-04). */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');
const pub = path.join(root, 'public');

describe('pie con versión', () => {
  it('cada página pública con pie carga js/version-web.js', () => {
    const paginas = readdirSync(pub).filter((f) => f.endsWith('.html'));
    const conPie = paginas.filter((f) => readFileSync(path.join(pub, f), 'utf8').includes('<footer'));
    expect(conPie.length).toBeGreaterThanOrEqual(16);
    for (const f of conPie) {
      expect(readFileSync(path.join(pub, f), 'utf8'), f).toContain('<script src="js/version-web.js" defer></script>');
    }
  });

  it('el generador escribe la versión de package.json y la fecha del build', () => {
    execFileSync(process.execPath, [path.join(root, 'scripts', 'version-web.mjs')], { cwd: root, stdio: 'ignore' });
    const js = readFileSync(path.join(pub, 'js', 'version-web.js'), 'utf8');
    const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(js).toContain(`"version":"${version}"`);
    expect(js).toMatch(/"fecha":"\d{4}-\d{2}-\d{2}"/);
  });
});
