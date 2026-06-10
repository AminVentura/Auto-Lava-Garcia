import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'data');
const targetDir = path.join(root, 'public', 'data');
const files = ['ofertas.json', 'lavado_precios.json', 'menu_restaurante.json'];

await mkdir(targetDir, { recursive: true });

for (const file of files) {
  const source = path.join(sourceDir, file);
  JSON.parse(await readFile(source, 'utf8'));
  await copyFile(source, path.join(targetDir, file));
  console.log(`synced data/${file} -> public/data/${file}`);
}
